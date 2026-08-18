import Link from 'next/link';
import { Grid2x2, Home, LogOut, Settings, Shield, TriangleAlert, Wrench } from 'lucide-react';
import { TenantSwitcher } from './tenant-switcher';
import { signOutAction } from '@/server/actions/auth.actions';
import { listUserTenants } from '@/lib/auth/current-tenant';
import type { CurrentTenant, CurrentUser } from '@/types';

interface Props {
  user: CurrentUser;
  current: CurrentTenant;
  children: React.ReactNode;
}

/**
 * Shell de navegación del área autenticada.
 *
 * En celular: barra inferior fija con los cuatro destinos reales, que es
 * donde llega el pulgar. En escritorio: la misma navegación en una fila
 * bajo el encabezado. Antes había una barra lateral fija de 224px, que en
 * un teléfono se comía la pantalla para mostrar dos enlaces.
 *
 * RSC — se renderiza en el servidor con la lista de comunidades ya cargada.
 */
export async function NavShell({ user, current, children }: Props) {
  const tenants = await listUserTenants();
  const { tenant } = current;
  const esAdmin = current.role === 'owner' || current.role === 'admin';

  const destinos = [
    { href: `/${tenant.slug}`, label: 'Inicio', icono: Home },
    { href: `/${tenant.slug}/directory/categories`, label: 'Categorías', icono: Grid2x2 },
    { href: `/${tenant.slug}/reportar`, label: 'Reportar', icono: TriangleAlert },
    esAdmin
      ? { href: `/${tenant.slug}/admin`, label: 'Admin', icono: Shield }
      : { href: `/${tenant.slug}/settings`, label: 'Ajustes', icono: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-secondary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/${tenant.slug}`}
              className="truncate font-display text-base font-semibold tracking-tight"
            >
              {tenant.name}
            </Link>
            <TenantSwitcher current={tenant} options={tenants} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Solo lo ve un admin de plataforma. Sin este enlace, la única
                forma de entrar a esa zona era escribir la URL a mano. */}
            {user.profile?.isPlatformAdmin && (
              <Link
                href="/platform-admin"
                data-tactil
                title="Administración de la plataforma"
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
              >
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Plataforma</span>
              </Link>
            )}
            <span className="hidden text-sm text-[var(--color-text-secondary)] md:inline">
              {user.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                data-tactil
                title="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>

        {/* Navegación de escritorio. En celular vive abajo, al alcance del pulgar. */}
        <nav
          aria-label="Secciones"
          className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 sm:flex"
        >
          {destinos.map(({ href, label, icono: Icono }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
            >
              <Icono className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* pb-20 en celular deja aire para que la barra inferior no tape nada. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">{children}</main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {destinos.map(({ href, label, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            <Icono className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
