import 'server-only';
import { z } from 'zod';
import { memberRepository } from '@/server/repositories/member.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { auditService } from './audit.service';
import { assertAuthenticated, assertRole, ForbiddenError } from '@/lib/auth/guards';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import type { Tenant, TenantInvitation } from '@a-la-mano/db';
import { TENANT_ROLES, type Role } from '@/types/role';
import { generateToken } from '@/lib/utils';
import { generarCodigoDeIngreso } from '@/lib/join-code';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(TENANT_ROLES),
});

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(TENANT_ROLES),
});

const INVITATION_TTL_DAYS = 7;

export const memberService = {
  async list(tenantId: string) {
    await assertRole(tenantId, ['owner', 'admin', 'member']);
    return memberRepository.listByTenant(tenantId);
  },

  async invite(tenantId: string, input: z.input<typeof inviteSchema>) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const { email, role } = inviteSchema.parse(input);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await memberRepository.createInvitation({
      tenantId,
      email: email.toLowerCase(),
      role,
      invitedBy: user.id,
      token: generateToken(),
      expiresAt,
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'member.invited',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email, role },
    });

    // TODO: integrar envío de email (Resend, SendGrid, Postmark...).
    // Por ahora devolvemos la invitación y se loggea el token para que el
    // dev pueda copiarlo manualmente en desarrollo.
    console.info(`[invite] Token para ${email}: ${invitation.token}`);

    return invitation;
  },

  async changeRole(tenantId: string, input: z.input<typeof changeRoleSchema>) {
    const { user, role: actorRole } = await assertRole(tenantId, ['owner', 'admin']);
    const { userId, role } = changeRoleSchema.parse(input);

    if (userId === user.id) {
      throw new ForbiddenError('No podés cambiar tu propio rol.');
    }

    // Solo un owner puede crear otros owners.
    if (role === 'owner' && actorRole !== 'owner') {
      throw new ForbiddenError('Solo un owner puede asignar el rol owner.');
    }

    const membership = await memberRepository.updateRole(tenantId, userId, role);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'member.role_changed',
      resourceType: 'membership',
      resourceId: membership.id,
      metadata: { targetUserId: userId, newRole: role },
    });

    return membership;
  },

  async remove(tenantId: string, targetUserId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);

    if (targetUserId === user.id) {
      throw new ForbiddenError('Para salir del tenant, usá "Abandonar tenant".');
    }

    await memberRepository.removeMember(tenantId, targetUserId);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'member.removed',
      resourceType: 'membership',
      resourceId: targetUserId,
    });
  },

  /**
   * Ingreso por el enlace de la comunidad.
   *
   * Es el camino masivo: el administrador comparte el enlace en el grupo del
   * edificio y cada residente entra iniciando sesión con Google. Como quien
   * llega ya se autenticó, tiene identidad — sin eso no podría calificar,
   * que es la mitad del producto.
   *
   * Quien ya es miembro no se duplica ni cambia de rol: entrar de nuevo por
   * el enlace es inofensivo.
   */
  async joinByCode(code: string, userId: string) {
    const tenant = await tenantRepository.findByJoinCode(code);
    if (!tenant) throw new Error('Ese enlace no corresponde a ninguna comunidad.');
    if (!tenant.joinCodeEnabled) {
      throw new Error(`${tenant.name} cerró el ingreso por enlace. Pedile acceso al administrador.`);
    }

    const existente = await memberRepository.findMembership(tenant.id, userId);
    if (existente) return { tenant, yaEraMiembro: true };

    await memberRepository.addMember({ tenantId: tenant.id, userId, role: 'member' });

    await auditService.log({
      tenantId: tenant.id,
      userId,
      action: 'member.joined_by_link',
      resourceType: 'membership',
      resourceId: userId,
    });

    return { tenant, yaEraMiembro: false };
  },

  /**
   * Genera un código nuevo. El anterior deja de funcionar al instante —
   * es la salida cuando el enlace se filtró fuera del edificio.
   */
  async rotateJoinCode(tenantId: string) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const tenant = await tenantRepository.update(tenantId, {
      joinCode: generarCodigoDeIngreso(),
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'tenant.join_code_rotated',
      resourceType: 'tenant',
      resourceId: tenantId,
    });

    return tenant;
  },

  async setJoinCodeEnabled(tenantId: string, habilitado: boolean) {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const tenant = await tenantRepository.update(tenantId, { joinCodeEnabled: habilitado });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: habilitado ? 'tenant.join_code_enabled' : 'tenant.join_code_disabled',
      resourceType: 'tenant',
      resourceId: tenantId,
    });

    return tenant;
  },

  async acceptInvitation(token: string, userId: string) {
    const invitation = await memberRepository.findInvitationByToken(token);
    if (!invitation) throw new Error('Invitación inválida.');
    if (invitation.acceptedAt) throw new Error('Esta invitación ya fue aceptada.');
    if (invitation.expiresAt < new Date()) throw new Error('La invitación expiró.');

    const profile = await userRepository.findById(userId);
    if (!profile) throw new Error('Profile no encontrado.');
    if (profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('Esta invitación es para otra cuenta.');
    }

    const existing = await memberRepository.findMembership(invitation.tenantId, userId);
    const role = (TENANT_ROLES as readonly string[]).includes(invitation.role)
      ? (invitation.role as Role)
      : 'member';

    if (!existing) {
      await memberRepository.addMember({
        tenantId: invitation.tenantId,
        userId,
        role,
      });
    }

    await memberRepository.markInvitationAccepted(invitation.id);

    await auditService.log({
      tenantId: invitation.tenantId,
      userId,
      action: 'member.joined',
      resourceType: 'invitation',
      resourceId: invitation.id,
    });

    return invitation;
  },

  /**
   * Lista las invitaciones pendientes del user actual (matching por email).
   * Resuelve también el tenant de cada una para mostrar el nombre en UI.
   */
  async listMyPendingInvitations(): Promise<
    Array<{ invitation: TenantInvitation; tenant: Tenant }>
  > {
    const user = await assertAuthenticated();
    const invitations = await memberRepository.listPendingByEmail(user.email);
    if (invitations.length === 0) return [];
    const tenants = await Promise.all(
      invitations.map((inv) => tenantRepository.findById(inv.tenantId)),
    );
    return invitations
      .map((invitation, i) => {
        const tenant = tenants[i];
        if (!tenant) return null;
        return { invitation, tenant };
      })
      .filter((row): row is { invitation: TenantInvitation; tenant: Tenant } => row !== null);
  },
};

export { inviteSchema, changeRoleSchema };
