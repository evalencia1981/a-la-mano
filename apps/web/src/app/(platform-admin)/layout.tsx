import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BarChart3, Building2, LayoutGrid, LogOut } from 'lucide-react';
import { getPlatformAdmin } from '@/lib/auth/platform-admin';
import { listUserTenants } from '@/lib/auth/current-tenant';
import { signOutAction } from '@/server/actions/auth.actions';

interface Props {
  children: React.ReactNode;
}

/**
 * Zona de administración de la plataforma: catálogo global de categorías,
 * comunidades y métricas cruzadas.
 *
 * El acceso exige sesión iniciada Y `profiles.is_platform_admin`. Si falta
 * cualquiera de las dos, responde 404 en vez de 403: a quien no corresponde
 * no le confirmamos siquiera que esta zona existe.
 *
 * Se distingue visualmente del resto de la app a propósito — acá se toca lo
 * que ven TODAS las comunidades, y conviene notar que uno salió de su
 * comunidad.
 */
export default async function PlatformAdminLayout({ children }: Props) {
  const admin = await getPlatformAdmin();
  if (!admin) notFound();

  /* Para poder volver a la comunidad donde uno estaba trabajando. */
  const tenants = await listUserTenants();
  const volverA = tenants[0]?.tenant.slug;

  const destinos = [
    { href: '/platform-admin', label: 'Métricas', icono: BarChart3 },
    { href: '/platform-admin/tenants', label: 'Comunidades', icono: Building2 },
    { href: '/platform-admin/categories', label: 'Categorías', icono: LayoutGrid },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-secondary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/platform-admin" className="font-display font-semibold tracking-tight">
              Plataforma
            </Link>
            <span className="hidden text-sm opacity-60 sm:inline">A la Mano</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {volverA && (
              <Link
                href={`/${volverA}`}
                data-tactil
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver a mi comunidad</span>
              </Link>
            )}
            <form action={signOutAction}>
              <button
                type="submit"
                data-tactil
                title="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-lg opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Secciones de plataforma" className="mx-auto max-w-5xl px-4 pb-2">
          <div className="flex gap-1 overflow-x-auto">
            {destinos.map(({ href, label, icono: Icono }) => (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <Icono className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
