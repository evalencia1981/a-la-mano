import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listUserTenants } from '@/lib/auth/current-tenant';
import { signOutAction } from '@/server/actions/auth.actions';
import { CreateTenantForm } from './create-tenant-form';

export const metadata = { title: 'Elegir organización' };

interface Props {
  searchParams: Promise<{ create?: string }>;
}

export default async function SelectTenantPage({ searchParams }: Props) {
  const params = await searchParams;
  const tenants = await listUserTenants();

  if (params.create === 'true' || tenants.length === 0) {
    return <CreateTenantCard hasExisting={tenants.length > 0} />;
  }

  if (tenants.length === 1 && tenants[0]) {
    redirect(`/${tenants[0].tenant.slug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Elegí una organización</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sos miembro de varias. ¿Cuál querés abrir?
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tenants.map(({ tenant, role }) => (
            <Link key={tenant.id} href={`/${tenant.slug}`}>
              <Card className="hover:border-[var(--color-accent-primary)] transition-colors">
                <CardHeader>
                  <CardTitle>{tenant.name}</CardTitle>
                  <CardDescription>{role}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}

          <Link href="/select-tenant?create=true">
            <Card className="hover:border-[var(--color-accent-primary)] transition-colors border-dashed">
              <CardContent className="flex items-center gap-3 py-8">
                <Plus className="h-5 w-5 text-[var(--color-text-secondary)]" />
                <span className="text-sm">Crear nueva organización</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="text-center">
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CreateTenantCard({ hasExisting }: { hasExisting: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {hasExisting ? 'Crear otra organización' : 'Creá tu organización'}
          </CardTitle>
          <CardDescription>
            {hasExisting
              ? 'Elegí un nombre y un slug único.'
              : 'Es el espacio compartido donde vas a invitar a tu equipo.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CreateTenantForm />
          {hasExisting && (
            <p className="text-center text-sm">
              <Link
                href="/select-tenant"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Volver al selector
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
