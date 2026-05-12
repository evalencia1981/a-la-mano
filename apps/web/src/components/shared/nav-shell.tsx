import Link from 'next/link';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { TenantSwitcher } from './tenant-switcher';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/server/actions/auth.actions';
import { listUserTenants } from '@/lib/auth/current-tenant';
import type { CurrentTenant, CurrentUser } from '@/types';

interface Props {
  user: CurrentUser;
  current: CurrentTenant;
  children: React.ReactNode;
}

/**
 * Shell de navegación para el área autenticada: topbar con tenant
 * switcher + sidebar con links principales. RSC — se renderea en el
 * server, con la lista de tenants ya cargada.
 */
export async function NavShell({ user, current, children }: Props) {
  const tenants = await listUserTenants();
  const { tenant } = current;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-secondary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href={`/${tenant.slug}`} className="font-semibold text-[var(--color-text-primary)]">
              {tenant.name}
            </Link>
            <TenantSwitcher current={tenant} options={tenants} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)] hidden md:inline">
              {user.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Cerrar sesión</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] py-4">
          <nav className="flex flex-col gap-1 px-3">
            <Link
              href={`/${tenant.slug}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href={`/${tenant.slug}/settings`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
