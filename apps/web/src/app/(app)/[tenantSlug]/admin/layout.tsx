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
    { href: `${base}/providers`, label: 'Proveedores' },
    { href: `${base}/suggestions`, label: 'Sugerencias' },
    { href: `${base}/billing`, label: 'Facturación' },
  ];

  return (
    <div className="flex gap-8">
      <nav className="w-48 space-y-1">
        <h2 className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] tracking-wide px-3 mb-2">
          Admin
        </h2>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--color-bg-secondary)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 max-w-4xl">{children}</div>
    </div>
  );
}
