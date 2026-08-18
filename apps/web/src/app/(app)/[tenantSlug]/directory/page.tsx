import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, Siren } from 'lucide-react';
import { DirectoryBrowser } from '@/components/directory/directory-browser';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { getCurrentUser } from '@/lib/auth/current-user';
import { esUrgencia } from '@/lib/category-groups';
import { communityProviderService } from '@/server/services/community-provider.service';
import { categoryService } from '@/server/services/category.service';

export const metadata = { title: 'Directorio' };

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function DirectoryPage({ params }: Props) {
  const { tenantSlug } = await params;
  const current = await getCurrentTenant(tenantSlug);
  if (!current) notFound();

  const [filas, categorias, user] = await Promise.all([
    communityProviderService.listInTenant(current.tenant.id, { limit: 100 }),
    categoryService.listActive(),
    getCurrentUser(),
  ]);

  /* Con esto arranca el chat de WhatsApp: quién escribe y desde qué
   * comunidad. Ver `armarMensajeContacto`. */
  const contacto = {
    residente: user?.profile?.fullName,
    comunidad: current.tenant.name,
    sector: current.tenant.sector,
  };

  /* Urgencias: solo tiene sentido ofrecerlas si la comunidad tiene a quién
   * llamar. Un atajo que lleva a una lista vacía es peor que no tenerlo. */
  const categoriasUrgencia = new Set(
    categorias.filter((c) => esUrgencia(c.slug)).map((c) => c.id),
  );
  const urgencias = filas.filter((f) => categoriasUrgencia.has(f.provider.categoryId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Directorio</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {filas.length === 0
              ? 'Todavía sin proveedores.'
              : `${filas.length} ${filas.length === 1 ? 'proveedor recomendado' : 'proveedores recomendados'} por ${current.tenant.name}.`}
          </p>
        </div>
        <Link
          href={`/${tenantSlug}/suggest`}
          data-tactil
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Sugerir uno
        </Link>
      </header>

      {urgencias.length > 0 && (
        <section
          aria-labelledby="urgencias"
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-urgencia-suave)' }}
        >
          <h2
            id="urgencias"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-urgencia)' }}
          >
            <Siren className="h-4 w-4" />
            Atienden 24 horas
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {urgencias.map((f) => (
              <li key={f.communityProvider.id}>
                <Link
                  href={`/${tenantSlug}/directory/provider/${f.communityProvider.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                  {f.provider.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-14 text-center">
          <h2 className="font-display text-xl font-semibold">Empecemos por el primero</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            Pensá en ese plomero o esa señora del aseo que todos en la unidad se pasan por
            WhatsApp. Ese es el primero que va acá.
          </p>
          <Link
            href={`/${tenantSlug}/suggest`}
            data-tactil
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            <Plus className="h-4 w-4" />
            Sugerir un proveedor
          </Link>
        </div>
      ) : (
        <DirectoryBrowser
          tenantSlug={tenantSlug}
          filas={filas}
          categorias={categorias}
          contacto={contacto}
        />
      )}
    </div>
  );
}
