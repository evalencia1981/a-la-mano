'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Send } from 'lucide-react';
import { type TipoIncidente } from '@/lib/incident-types';
import { crearReporteAction } from '@/server/actions/incident.actions';
import { BotonMicrofono } from '@/components/shared/boton-microfono';
import { SelectorLugar, type OpcionLugar, type TorreConPisos } from './selector-lugar';
import { SelectorTipo } from './selector-tipo';

/**
 * Reportar algo que pasó en la comunidad.
 *
 * Está armado para resolverse de pie, con una mano, en menos de un minuto:
 * se elige el tipo de una grilla —no de una lista desplegable—, el lugar es
 * opcional y la descripción también. Si reportar costara llenar un
 * formulario largo, la gente seguiría escribiendo en el grupo de WhatsApp,
 * que es exactamente lo que queremos reemplazar.
 */
interface Props {
  tenantId: string;
  /** El mapa de la comunidad, para elegir el lugar sin teclear. */
  torres: TorreConPisos[];
  zonas: OpcionLugar[];
  /** Owner o admin: puede agregar un lugar al mapa sin salir del reporte. */
  esAdmin: boolean;
}

export function ReporteForm({ tenantId, torres, zonas, esAdmin }: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoIncidente | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  /* Controlado porque el dictado tiene que poder escribir adentro. */
  const [descripcion, setDescripcion] = useState('');

  function enviar(formData: FormData) {
    if (!tipo) {
      setError('Elegí qué pasó.');
      return;
    }
    setError(null);
    formData.set('type', tipo.slug);
    startTransition(async () => {
      const result = await crearReporteAction(tenantId, formData);
      if (!result.ok) setError(result.error);
      else {
        setEnviado(true);
        router.refresh();
      }
    });
  }

  if (enviado) {
    return (
      <div className="superficie rounded-[var(--radio-ficha)] px-6 py-10 text-center">
        <div
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--color-success)' }}
        >
          <Check className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">Reporte enviado</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
          La administración lo va a ver junto con los demás reportes del mismo tipo. Cuando
          varios vecinos reportan lo mismo, se vuelve un caso que se puede sustentar.
        </p>
        <button
          type="button"
          data-tactil
          onClick={() => {
            setEnviado(false);
            setTipo(null);
            setDescripcion('');
          }}
          className="mt-5 rounded-[var(--radio-control)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          Reportar otra cosa
        </button>
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-6">
      <SelectorTipo valor={tipo} onCambio={setTipo} />

      {tipo && (
        <>
          <SelectorLugar
            tenantId={tenantId}
            esAdmin={esAdmin}
            torres={torres}
            zonas={zonas}
          />

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Contá qué viste{' '}
              <span className="font-normal text-[var(--color-text-secondary)]">(opcional)</span>
            </label>
            <div className="flex items-start gap-2">
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Qué pasó y a qué hora."
                className="w-full flex-1 campo px-3 py-2.5 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
              />
              <BotonMicrofono
                valor={descripcion}
                onCambio={setDescripcion}
                etiqueta="Dictar lo que viste"
                onError={setError}
                deshabilitado={isPending}
              />
            </div>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-tactil
        disabled={isPending || !tipo}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radio-panel)] bg-[var(--color-accent-primary)] px-4 py-3.5 text-base font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-40 foco"
      >
        <Send className="h-4 w-4" />
        {isPending ? 'Enviando…' : 'Enviar reporte'}
      </button>

      <p className="text-center text-xs text-[var(--color-text-secondary)]">
        Se reporta el hecho, nunca a una persona. Tus vecinos no ven quién reportó.
      </p>
    </form>
  );
}
