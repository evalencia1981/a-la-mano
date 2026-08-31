'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Estrellas de calificación, en modo lectura o edición.
 *
 * En modo edición son botones de verdad, no SVG con `role="button"`: así se
 * pueden recorrer y activar con el teclado, que antes era imposible.
 */
export function RatingStars({
  value,
  size = 16,
  editable = false,
  onChange,
}: {
  value: number;
  size?: number;
  editable?: boolean;
  onChange?: (next: number) => void;
}) {
  const estrellas = [1, 2, 3, 4, 5];

  if (!editable) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`${value.toFixed(1)} de 5 estrellas`}
      >
        {estrellas.map((n) => (
          <Star
            key={n}
            width={size}
            height={size}
            aria-hidden
            className={
              n <= Math.round(value)
                ? 'fill-[var(--color-estrella)] text-[var(--color-estrella)]'
                : 'text-[var(--color-border)]'
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {estrellas.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          aria-pressed={n === Math.round(value)}
          className="rounded transition-transform hover:scale-110 foco"
        >
          <Star
            width={size}
            height={size}
            className={cn(
              'transition-colors',
              n <= Math.round(value)
                ? 'fill-[var(--color-estrella)] text-[var(--color-estrella)]'
                : 'text-[var(--color-border)]',
            )}
          />
        </button>
      ))}
    </div>
  );
}
