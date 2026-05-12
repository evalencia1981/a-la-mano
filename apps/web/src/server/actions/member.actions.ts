'use server';

import { revalidatePath } from 'next/cache';
import { memberService } from '@/server/services/member.service';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { isRole } from '@/types/role';
import { fail, ok, type ActionResult } from './result';

async function revalidateMembers(tenantId: string) {
  const tenant = await tenantRepository.findById(tenantId);
  if (tenant) revalidatePath(`/${tenant.slug}/settings/members`);
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

export async function acceptInvitationAction(
  token: string,
  userId: string,
): Promise<ActionResult<{ tenantId: string }>> {
  try {
    const invitation = await memberService.acceptInvitation(token, userId);
    return ok({ tenantId: invitation.tenantId });
  } catch (error) {
    return fail(error);
  }
}
