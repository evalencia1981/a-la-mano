import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { GeneralSettingsForm } from './general-form';

export const metadata = { title: 'Configuración' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function GeneralSettingsPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const canEdit = current.role === 'owner' || current.role === 'admin';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">General</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Datos básicos de la organización.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
          <CardDescription>
            {canEdit ? 'Editá el nombre y la configuración regional.' : 'Solo owners y admins pueden editar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm tenant={current.tenant} disabled={!canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
