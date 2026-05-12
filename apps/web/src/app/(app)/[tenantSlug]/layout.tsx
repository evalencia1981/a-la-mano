import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { NavShell } from '@/components/shared/nav-shell';
import { TenantThemeProvider } from '@/components/shared/theme-provider';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Layout del área autenticada por tenant. Valida:
 *  - El user existe (redundante con (app)/layout pero seguro).
 *  - El tenant existe y el user es miembro.
 *  - Inyecta variables CSS de branding del tenant.
 *
 * Si algo falla, 404 (no exponemos si el tenant existe pero no sos miembro).
 */
export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  return (
    <TenantThemeProvider
      primaryColor={current.tenant.primaryColor}
      secondaryColor={current.tenant.secondaryColor}
    >
      <NavShell user={user} current={current}>
        {children}
      </NavShell>
    </TenantThemeProvider>
  );
}
