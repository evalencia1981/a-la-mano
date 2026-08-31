'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProviderPhoto } from '@a-la-mano/db';

/**
 * Galería de fotos del proveedor.
 *
 * Cuando no hay fotos no se renderiza nada: la ficha muestra en su lugar el
 * ícono del oficio, que se ve intencional en vez de un hueco con un cartel
 * de "sin fotos". Quien puede resolverlo (un admin) recibe el atajo para
 * subirlas desde la página del proveedor.
 */
export function PhotoGallery({ photos }: { photos: ProviderPhoto[] }) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const actual = photos[index] ?? photos[0]!;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-[var(--radio-ficha)] bg-[var(--color-bg-secondary)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={actual.publicUrl}
          alt={actual.altText ?? 'Foto del trabajo del proveedor'}
          className="h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <>
            <BotonPaso
              lado="izquierda"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            />
            <BotonPaso
              lado="derecha"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
            />
            <span className="tabular absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1}/{photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-[var(--radio-control)] border-2 transition-colors foco ${
                i === index ? 'border-[var(--color-text-primary)]' : 'border-transparent opacity-70'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.publicUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BotonPaso({ lado, onClick }: { lado: 'izquierda' | 'derecha'; onClick: () => void }) {
  const Icono = lado === 'izquierda' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      data-tactil
      aria-label={lado === 'izquierda' ? 'Foto anterior' : 'Foto siguiente'}
      className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        lado === 'izquierda' ? 'left-2' : 'right-2'
      }`}
    >
      <Icono className="h-5 w-5" />
    </button>
  );
}
