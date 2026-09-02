'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import {
  deleteProviderPhotoAction,
  setPrimaryProviderPhotoAction,
  uploadProviderPhotoAction,
} from '@/server/actions/provider-photo.actions';
import type { ProviderPhoto } from '@a-la-mano/db';

const MAXIMO = 6;
const TAMAÑO_MAXIMO = 5 * 1024 * 1024;

/**
 * Gestión de fotos de un proveedor: subir, elegir la principal y borrar.
 *
 * Los controles de cada foto están siempre visibles. Antes aparecían con
 * `group-hover`, lo que en un celular significa que no aparecían nunca.
 *
 * El archivo se valida acá antes de viajar (tipo y peso) para no gastar una
 * subida entera en algo que el servidor va a rechazar igual; la validación
 * de verdad sigue estando en `providerPhotoService.upload`, que además pasa
 * la imagen por sharp y la convierte a WebP.
 */
export function PhotoManager({
  tenantId,
  providerId,
  photos,
}: {
  tenantId: string;
  providerId: string;
  photos: ProviderPhoto[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const alTope = photos.length >= MAXIMO;

  function subir(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo se aceptan imágenes JPG, PNG o WebP.');
      return;
    }
    if (file.size > TAMAÑO_MAXIMO) {
      setError(`La imagen pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es 5 MB.`);
      return;
    }
    const formData = new FormData();
    formData.set('file', file);
    setError(null);
    startTransition(async () => {
      const result = await uploadProviderPhotoAction(tenantId, providerId, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  function alElegir(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) subir(file);
  }

  function alSoltar(event: React.DragEvent) {
    event.preventDefault();
    setArrastrando(false);
    if (alTope || isPending) return;
    const file = event.dataTransfer.files?.[0];
    if (file) subir(file);
  }

  function hacerPrincipal(photoId: string) {
    startTransition(async () => {
      const result = await setPrimaryProviderPhotoAction(tenantId, providerId, photoId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function eliminar(photoId: string) {
    if (!confirm('¿Eliminar esta foto?')) return;
    startTransition(async () => {
      const result = await deleteProviderPhotoAction(tenantId, providerId, photoId);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <figure
              key={p.id}
              className="overflow-hidden rounded-[var(--radio-panel)] border border-[var(--color-border)]"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.publicUrl}
                  alt={p.altText ?? ''}
                  className="aspect-video w-full object-cover"
                />
                {p.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--color-accent-primary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent-ink)]">
                    Principal
                  </span>
                )}
              </div>

              <figcaption className="flex items-center justify-between gap-1 border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5">
                <button
                  type="button"
                  data-tactil
                  disabled={isPending || p.isPrimary}
                  onClick={() => hacerPrincipal(p.id)}
                  className="flex items-center gap-1.5 rounded-[var(--radio-control)] px-2 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 foco"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${p.isPrimary ? 'fill-[var(--color-estrella)] text-[var(--color-estrella)]' : ''}`}
                  />
                  {p.isPrimary ? 'Es la principal' : 'Hacer principal'}
                </button>
                <button
                  type="button"
                  data-tactil
                  disabled={isPending}
                  onClick={() => eliminar(p.id)}
                  title="Eliminar foto"
                  className="flex items-center justify-center rounded-[var(--radio-control)] px-2 py-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-error)] disabled:opacity-40 foco"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Eliminar foto</span>
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={alElegir}
        disabled={alTope || isPending}
      />

      {!alTope && (
        <button
          type="button"
          data-tactil
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radio-panel)] border-2 border-dashed px-6 py-8 text-center transition-colors foco ${
            arrastrando
              ? 'border-[var(--color-accent-primary)] bg-[var(--color-bg-secondary)]'
              : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
          } disabled:opacity-60`}
        >
          {isPending ? (
            <>
              <Upload className="h-6 w-6 animate-pulse text-[var(--color-text-secondary)]" />
              <span className="text-sm font-medium">Subiendo…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-[var(--color-text-secondary)]" />
              <span className="text-sm font-medium">
                {photos.length === 0 ? 'Subir la primera foto' : 'Agregar otra foto'}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Tocá para elegir o arrastrá una imagen · JPG, PNG o WebP · hasta 5 MB
              </span>
            </>
          )}
        </button>
      )}

      {alTope && (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Llegaste al máximo de {MAXIMO} fotos. Borrá alguna para subir otra.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
