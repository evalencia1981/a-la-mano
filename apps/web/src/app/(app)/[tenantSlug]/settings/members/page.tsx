import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { memberService } from '@/server/services/member.service';
import { InviteMemberForm } from './invite-form';
import { MembersTable } from './members-table';

export const metadata = { title: 'Miembros' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const members = await memberService.list(current.tenant.id);
  const canManage = current.role === 'owner' || current.role === 'admin';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Miembros</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Gestioná quién accede a {current.tenant.name} y con qué rol.
        </p>
      </header>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invitar miembro</CardTitle>
            <CardDescription>
              Mandamos un token al email. (Mientras el envío automático no esté configurado, el
              token se loggea en consola del server para uso en dev.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm tenantId={current.tenant.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Miembros actuales ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <MembersTable
            members={members}
            tenantId={current.tenant.id}
            actorRole={current.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
