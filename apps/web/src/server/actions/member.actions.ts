'use server';

import { revalidatePath } from 'next/cache';
import { memberService } from '@/server/services/member.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { isRole } from '@/types/role';
import { assertAuthenticated } from '@/lib/auth/guards';
import { fail, ok, type ActionResult } from './result';

async function revalidateMembers(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) revalidatePath(`/${tenant.slug}/settings/members`);
}

/**
 * Regenera el enlace de ingreso. El anterior deja de servir en el acto.
 * No devuelve el código nuevo: la página se revalida y lo muestra.
 */
export async function rotateJoinCodeAction(tenantId: string): Promise<ActionResult<void>> {
  try {
    await memberService.rotateJoinCode(tenantId);
    await revalidateMembers(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function setJoinCodeEnabledAction(
  tenantId: string,
  habilitado: boolean,
): Promise<ActionResult<void>> {
  try {
    await memberService.setJoinCodeEnabled(tenantId, habilitado);
    await revalidateMembers(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function inviteMemberAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  try {
    const role = String(formData.get('role') ?? 'member');
    if (!isRole(role)) return fail(new Error('Rol inválido.'));

    const invitation = await memberService.invite(tenantId, {
      email: String(formData.get('email') ?? ''),
      role,
    });
    await revalidateMembers(tenantId);
    return ok({ token: invitation.token });
  } catch (error) {
    return fail(error);
  }
}

export async function changeRoleAction(
  tenantId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const role = String(formData.get('role') ?? '');
    if (!isRole(role)) return fail(new Error('Rol inválido.'));

    await memberService.changeRole(tenantId, {
      userId: String(formData.get('userId') ?? ''),
      role,
    });
    await revalidateMembers(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function removeMemberAction(
  tenantId: string,
  userId: string,
): Promise<ActionResult<void>> {
  try {
    await memberService.remove(tenantId, userId);
    await revalidateMembers(tenantId);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Acepta una invitación con el token recibido. Resuelve el user desde la
 * sesión actual — NUNCA recibirlo como parámetro del cliente (sería
 * suplantable).
 */
export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult<{ tenantId: string; tenantSlug: string }>> {
  try {
    const user = await assertAuthenticated();
    const invitation = await memberService.acceptInvitation(token, user.id);
    const tenant = await tenantRepository.findById(invitation.tenantId);
    if (!tenant) throw new Error('Tenant no encontrado.');
    return ok({ tenantId: invitation.tenantId, tenantSlug: tenant.slug });
  } catch (error) {
    return fail(error);
  }
}
