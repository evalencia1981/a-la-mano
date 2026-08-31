'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ProviderCard, type DatosDeContacto } from '@/components/provider/provider-card';
import { colorDeGrupo, etiquetaDeGrupo } from '@/lib/category-groups';
import type { Category, CommunityProvider, Provider, ProviderPhoto } from '@a-la-mano/db';

export interface FilaDirectorio {
  communityProvider: CommunityProvider;
  provider: Provider;
  primaryPhoto: ProviderPhoto | null;
}

/**
 * Buscador del directorio.
 *
 * Filtra en memoria, no contra el servidor: el listado ya viene completo
 * (tope de 100 proveedores por comunidad) y una unidad residencial no llega
 * a esa cifra. A cambio, los resultados aparecen mientras se escribe, sin
 * recargar la página ni perder el teclado en el celular — que era el problema
 * real del filtro anterior, con su botón "Filtrar" y su viaje de ida y vuelta.
 *
 * Si alguna comunidad supera ese tope, esto pasa a búsqueda server-side con
 * el filtro que `communityProviderRepository.listByTenant` ya soporta.
 */
export function DirectoryBrowser({
  tenantSlug,
  filas,
  categorias,
  contacto,
}: {
  tenantSlug: string;
  filas: FilaDirectorio[];
  categorias: Category[];
  contacto?: DatosDeContacto;
}) {
  const [texto, setTexto] = useState('');
  /* 'todos' o el nombre del grupo tal como está en la categoría. */
  const [grupo, setGrupo] = useState<string>('todos');

  const categoriaPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );

  /* Grupos presentes en esta comunidad. No mostramos filtros vacíos.
   * Se agrupa por el nombre real y no por los cinco originales: el catálogo
   * admite grupos nuevos, y meterlos todos en "Otros" los volvería
   * indistinguibles. */
  const gruposDisponibles = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const fila of filas) {
      const nombre = categoriaPorId.get(fila.provider.categoryId)?.groupName ?? 'Otros';
      vistos.set(nombre, (vistos.get(nombre) ?? 0) + 1);
    }
    return [...vistos.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas, categoriaPorId]);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return filas.filter((fila) => {
      const categoria = categoriaPorId.get(fila.provider.categoryId);
      if (grupo !== 'todos' && (categoria?.groupName ?? 'Otros') !== grupo) return false;
      if (!q) return true;
      /* Busca por nombre, oficio, barrio y descripción: la gente escribe
       * "uñas" o "Laureles" con la misma naturalidad que un nombre propio. */
      return [
        fila.provider.name,
        fila.provider.description,
        fila.provider.neighborhood,
        fila.provider.city,
        categoria?.name,
      ]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(q));
    });
  }, [filas, texto, grupo, categoriaPorId]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
          aria-hidden
        />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar plomero, uñas, Laureles…"
          aria-label="Buscar en el directorio"
          className="h-12 w-full campo pl-10 pr-10 text-base outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-text-primary)]"
        />
        {texto && (
          <button
            type="button"
            onClick={() => setTexto('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radio-control)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {gruposDisponibles.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip activo={grupo === 'todos'} onClick={() => setGrupo('todos')}>
            Todos
            <Cuenta>{filas.length}</Cuenta>
          </Chip>
          {gruposDisponibles.map(([nombre, cantidad]) => (
            <Chip
              key={nombre}
              activo={grupo === nombre}
              onClick={() => setGrupo(nombre)}
              color={colorDeGrupo(nombre)}
            >
              {etiquetaDeGrupo(nombre)}
              <Cuenta>{cantidad}</Cuenta>
            </Chip>
          ))}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {visibles.length} resultados
      </p>

      {visibles.length === 0 ? (
        <div className="rounded-[var(--radio-panel)] border border-dashed border-[var(--color-border)] px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Nadie por acá todavía</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
            {texto
              ? `Ningún proveedor coincide con “${texto}”. Probá con el oficio, por ejemplo “electricista”.`
              : 'No hay proveedores en este grupo.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibles.map((fila) => (
            <ProviderCard
              key={fila.communityProvider.id}
              tenantSlug={tenantSlug}
              communityProvider={fila.communityProvider}
              provider={fila.provider}
              primaryPhoto={fila.primaryPhoto}
              category={categoriaPorId.get(fila.provider.categoryId) ?? null}
              contacto={contacto}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  color,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tactil
      aria-pressed={activo}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors foco ${
        activo
          ? 'border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
      }`}
    >
      {color && !activo && (
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {children}
    </button>
  );
}

function Cuenta({ children }: { children: React.ReactNode }) {
  return <span className="tabular text-xs opacity-60">{children}</span>;
}
