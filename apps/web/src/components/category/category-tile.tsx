import Link from 'next/link';
import { BadgeCheck, ChevronRight } from 'lucide-react';
import { esUrgencia, estiloTinte } from '@/lib/category-groups';
import { iconoDe } from '@/lib/category-icons';
import type { Category } from '@a-la-mano/db';

/** Cuántos proveedores tiene la comunidad en esta categoría. */
export interface ConteoCategoria {
  total: number;
  avalados: number;
}

/**
 * Ficha de una categoría del directorio.
 *
 * El color de la ficha es el del grupo de servicio (`colorDeGrupo`), no un
 * adorno: recorriendo la grilla, todo lo de limpieza comparte tono y el ojo
 * agrupa antes de leer un solo título.
 *
 * El dato al pie es la parte que más cambia el uso. Sin él, las cuarenta
 * categorías del catálogo se ofrecen por igual y el vecino cae en pantallas
 * vacías; con él sabe antes de tocar si acá hay a quién llamar. La categoría
 * sin nadie no se esconde — se apaga y ofrece sugerir, que es la única forma
 * de que deje de estar vacía.
 */
export function CategoryTile({
  category,
  href,
  conteo,
}: {
  category: Category;
  href: string;
  conteo?: ConteoCategoria;
}) {
  const Icono = iconoDe(category.iconName);
  const urgencia = esUrgencia(category.slug);
  const vacia = conteo?.total === 0;

  return (
    <Link
      href={href}
      data-tactil
      data-interactiva
      data-vacia={vacia ? '' : undefined}
      style={estiloTinte(category.groupName)}
      className="ficha foco group flex h-full flex-col gap-5 p-6 data-[vacia]:opacity-60 data-[vacia]:hover:opacity-100"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radio-control)] shadow-[var(--sombra-ficha)]"
          style={{
            backgroundColor: 'var(--tinte)',
            color: 'var(--tinta)',
          }}
        >
          <Icono className="h-7 w-7" strokeWidth={1.75} />
        </span>

        {urgencia && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              color: 'var(--color-urgencia)',
              backgroundColor: 'var(--color-urgencia-suave)',
            }}
          >
            24 horas
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-[var(--color-text-secondary)]">
            {category.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {conteo ? (
          vacia ? (
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Sugerí el primero
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="pastilla">
                {conteo.total} {conteo.total === 1 ? 'proveedor' : 'proveedores'}
              </span>
              {conteo.avalados > 0 && (
                <span className="tabular inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {conteo.avalados} {conteo.avalados === 1 ? 'avalado' : 'avalados'}
                </span>
              )}
            </span>
          )
        ) : (
          <span />
        )}

        <ChevronRight
          className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
