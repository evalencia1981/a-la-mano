'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changeRoleAction, removeMemberAction } from '@/server/actions/member.actions';
import { TENANT_ROLES, type Role } from '@/types/role';
import type { MemberWithProfile } from '@/server/repositories/member.repository';

interface Props {
  members: MemberWithProfile[];
  tenantId: string;
  actorRole: Role;
}

export function MembersTable({ members, tenantId, actorRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canManage = actorRole === 'owner' || actorRole === 'admin';

  function handleRoleChange(userId: string, role: string) {
    const formData = new FormData();
    formData.set('userId', userId);
    formData.set('role', role);
    startTransition(async () => {
      const result = await changeRoleAction(tenantId, formData);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  function handleRemove(userId: string) {
    if (!confirm('¿Quitar a este miembro?')) return;
    startTransition(async () => {
      const result = await removeMemberAction(tenantId, userId);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-[var(--color-text-secondary)]">
          <tr>
            <th className="py-2 font-medium">Miembro</th>
            <th className="py-2 font-medium">Rol</th>
            {canManage && <th className="py-2 font-medium w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {members.map(({ member, email, fullName }) => (
            <tr key={member.id}>
              <td className="py-3">
                <div className="font-medium">{fullName ?? email}</div>
                {fullName && (
                  <div className="text-xs text-[var(--color-text-secondary)]">{email}</div>
                )}
              </td>
              <td className="py-3">
                {canManage ? (
                  <select
                    defaultValue={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                    disabled={isPending}
                    className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 text-xs"
                  >
                    {TENANT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs">{member.role}</span>
                )}
              </td>
              {canManage && (
                <td className="py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleRemove(member.userId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Quitar</span>
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
