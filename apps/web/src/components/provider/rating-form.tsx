'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RatingStars } from './rating-stars';
import { submitRatingAction } from '@/server/actions/rating.actions';
import type { Rating } from '@a-la-mano/db';

const LEYENDAS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

/**
 * Calificar a un proveedor. El título de la sección ya dice de qué se trata,
 * así que acá no se repite: las estrellas hablan solas y al elegir aparece la
 * palabra correspondiente, que confirma la elección sin tener que contar.
 */
export function RatingForm({
  tenantId,
  communityProviderId,
  initial,
}: {
  tenantId: string;
  communityProviderId: string;
  initial: Rating | null;
}) {
  const router = useRouter();
  const [estrellas, setEstrellas] = useState<number>(initial?.stars ?? 0);
  const [comentario, setComentario] = useState<string>(initial?.comment ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar(formData: FormData) {
    setError(null);
    if (estrellas < 1) {
      setError('Elegí al menos una estrella.');
      return;
    }
    formData.set('communityProviderId', communityProviderId);
    formData.set('stars', String(estrellas));
    formData.set('comment', comentario);

    startTransition(async () => {
      const result = await submitRatingAction(tenantId, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <form action={enviar} className="space-y-4">
      <div className="flex items-center gap-3">
        <RatingStars value={estrellas} editable onChange={setEstrellas} size={30} />
        {estrellas > 0 && (
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {LEYENDAS[estrellas]}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="comment" className="text-sm text-[var(--color-text-secondary)]">
          Contá cómo te fue (opcional)
        </label>
        <textarea
          id="comment"
          name="comment"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full campo px-3 py-2.5 text-[15px] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-text-primary)]"
          placeholder="¿Llegó puntual? ¿Cobró lo que dijo? Lo que le sirva al vecino que lo lea."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-tactil
        disabled={isPending}
        className="rounded-[var(--radio-control)] bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50 foco"
      >
        {isPending ? 'Guardando…' : initial ? 'Actualizar calificación' : 'Publicar calificación'}
      </button>
    </form>
  );
}
