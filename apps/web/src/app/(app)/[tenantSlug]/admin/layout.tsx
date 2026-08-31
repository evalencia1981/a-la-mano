import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/auth/current-tenant';

interface Props {
  params: Promise<{ tenantSlug: string }>;
  children: React.ReactNode;
}

/**
 * Gate de admin. Solo owner/admin pueden entrar acá; member redirige a 404
 * (no exponemos que el área existe).
 */
export default async function AdminLayout({ params, children }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();
  if (current.role !== 'owner' && current.role !== 'admin') notFound();

  const base = `/${tenantSlug}/admin`;
  const links = [
    { href: base, label: 'Dashboard' },
    /* Segundo y no último: es la pantalla que se abre cien veces por día. */
    { href: `${base}/pendientes`, label: 'Pendientes' },
    { href: `${base}/providers`, label: 'Proveedores' },
    { href: `${base}/suggestions`, label: 'Sugerencias' },
    { href: `${base}/lugares`, label: 'Mapa de la unidad' },
    { href: `${base}/puestos`, label: 'Puestos de trabajo' },
    { href: `${base}/billing`, label: 'Facturación' },
  ];

  /* En el teléfono la navegación es una fila de pestañas que se desliza; en
   * escritorio vuelve a ser la barra lateral. Antes era una columna fija de
   * 192px siempre: con la separación se comía 224px de un ancho de 360, y
   * dejaba el contenido en 136px. */
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:w-48 lg:flex-col lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0">
        <h2 className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] lg:block">
          Admin
        </h2>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm hover:bg-[var(--color-bg-secondary)] lg:block"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1 lg:max-w-4xl">{children}</div>
    </div>
  );
}
