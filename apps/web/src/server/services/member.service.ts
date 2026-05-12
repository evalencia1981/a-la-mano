import 'server-only';
import { z } from 'zod';
import { memberRepository } from '@/server/repositories/member.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { auditService } from './audit.service';
import { assertRole, ForbiddenError } from '@/lib/auth/guards';
import { TENANT_ROLES, type Role } from '@/types/role';
import { generateToken } from '@/lib/utils';

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
};

export { inviteSchema, changeRoleSchema };
