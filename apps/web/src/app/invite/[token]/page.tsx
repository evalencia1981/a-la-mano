import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { memberRepository } from '@/server/repositories/member.repository';
import { tenantRepository } from '@/server/repositories/tenant.repository';
import { getCurrentUser } from '@/lib/auth/current-user';
import { AcceptInvitationButton } from './accept-button';

export const metadata = { title: 'Invitación' };

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Pantalla pública para aceptar una invitación.
 *
 * Flujo:
 *  - Si la invitación no existe / venció / ya fue aceptada → mensaje claro, sin botón.
 *  - Si el user NO está logueado → links a login / signup con el email pre-rellenado.
 *  - Si el user está logueado con el email correcto → botón "Aceptar".
 *  - Si el user está logueado con OTRO email → error explicando.
 */
export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;

  const invitation = await memberRepository.findInvitationByToken(token);
  if (!invitation) {
    return <Layout>
      <ErrorCard
        title="Invitación inválida"
        message="El link no corresponde a ninguna invitación. Revisá que esté completo o pedile al admin que te mande uno nuevo."
      />
    </Layout>;
  }
  if (invitation.acceptedAt) {
    return <Layout>
      <ErrorCard
        title="Invitación ya aceptada"
        message="Este link ya fue usado. Iniciá sesión normalmente para entrar a la comunidad."
      />
    </Layout>;
  }
  if (invitation.expiresAt < new Date()) {
    return <Layout>
      <ErrorCard
        title="Invitación vencida"
        message="Pedile al admin que te mande una nueva."
      />
    </Layout>;
  }

  const tenant = await tenantRepository.findById(invitation.tenantId);
  if (!tenant) {
    return <Layout>
      <ErrorCard title="Comunidad no encontrada" message="Algo se desincronizó. Avisale al admin." />
    </Layout>;
  }

  const user = await getCurrentUser();

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle>Te invitaron a {tenant.name}</CardTitle>
          <CardDescription>
            Rol asignado: <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            La invitación es para <strong>{invitation.email}</strong>.
          </p>

          {!user && (
            <div className="space-y-3">
              <p className="text-sm">Para aceptarla, iniciá sesión o creá una cuenta con ese email.</p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/login?email=${encodeURIComponent(invitation.email)}`}>
                    Iniciar sesión
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/signup?email=${encodeURIComponent(invitation.email)}`}>
                    Crear cuenta
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Después de loguearte volvé a abrir este link.
              </p>
            </div>
          )}

          {user && user.email.toLowerCase() !== invitation.email.toLowerCase() && (
            <div className="rounded-[var(--radio-control)] border border-[var(--color-error)] bg-[var(--color-error)]/10 p-3 text-sm">
              Estás logueado como <strong>{user.email}</strong>, pero la invitación es para{' '}
              <strong>{invitation.email}</strong>. Cerrá sesión y entrá con esa cuenta.
            </div>
          )}

          {user && user.email.toLowerCase() === invitation.email.toLowerCase() && (
            <AcceptInvitationButton token={token} />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
