'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pencil, X } from 'lucide-react';
import { BotonMicrofono } from '@/components/shared/boton-microfono';
import { estiloTinteColor } from '@/lib/category-groups';
import {
  ESTADOS_INCIDENTE,
  etiquetaIncidente,
  sePuedeEditar,
  tipoIncidente,
  type EstadoIncidente,
  type TipoIncidente,
} from '@/lib/incident-types';
import { editarReporteAction } from '@/server/actions/incident.actions';
import { SelectorLugar, type OpcionLugar, type TorreConPisos } from './selector-lugar';
import { SelectorTipo } from './selector-tipo';
import type { IncidentReport } from '@a-la-mano/db';

/** Color del estado. El resuelto es el único que celebra algo. */
const COLOR_ESTADO: Record<EstadoIncidente, string> = {
  nuevo: 'var(--color-text-secondary)',
  en_proceso: 'var(--color-accent-primary)',
  resuelto: 'var(--color-success)',
};

interface Props {
  tenantId: string;
  reportes: IncidentReport[];
  torres: TorreConPisos[];
  zonas: OpcionLugar[];
  esAdmin: boolean;
}

/**
 * Lo que reportó esta persona, con la opción de corregirlo.
 *
 * La corrección existe por cómo se reporta: de pie, con una mano, en menos
 * de un minuto. Eso es lo que hace rápido el módulo y también lo que hace
 * que alguien toque "Mascotas" cuando era "Basuras", o Torre 2 cuando era
 * la 3. Sin poder corregir, la única salida es reportar de nuevo, y la
 * administración termina con dos reportes del mismo hecho — que es
 * justamente lo que rompe el conteo por patrón, que es para lo que sirve
 * todo esto.
 *
 * Se abre uno a la vez. Dos formularios largos abiertos en un teléfono es
 * perder de vista cuál se está editando.
 */
export function MisReportes({ tenantId, reportes, torres, zonas, esAdmin }: Props) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <section className="space-y-3 border-t border-[var(--color-border)] pt-6">
      <h2 className="font-display text-lg font-semibold">Lo que reportaste</h2>
      <ul className="space-y-2">
        {reportes.map((r) =>
          editando === r.id ? (
            <li key={r.id}>
              <FormularioCorreccion
                tenantId={tenantId}
                reporte={r}
                torres={torres}
                zonas={zonas}
                esAdmin={esAdmin}
                onCerrar={() => setEditando(null)}
              />
            </li>
          ) : (
            <Fila key={r.id} reporte={r} onCorregir={() => setEditando(r.id)} />
          ),
        )}
      </ul>
    </section>
  );
}

function Fila({ reporte, onCorregir }: { reporte: IncidentReport; onCorregir: () => void }) {
  const estado = (reporte.status in ESTADOS_INCIDENTE
    ? reporte.status
    : 'nuevo') as EstadoIncidente;

  return (
    <li
      style={estiloTinteColor(COLOR_ESTADO[estado])}
      className="ficha flex items-start justify-between gap-3 px-3.5 py-3"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{etiquetaIncidente(reporte.type)}</div>
        <div className="truncate text-xs text-[var(--color-text-secondary)]">
          {reporte.location ? `${reporte.location} · ` : ''}
          {reporte.createdAt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
        </div>
        {reporte.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
            {reporte.description}
          </p>
        )}
        {reporte.resolutionNote && (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Respuesta: {reporte.resolutionNote}
          </p>
        )}

        {sePuedeEditar(reporte.status) && (
          <button
            type="button"
            data-tactil
            onClick={onCorregir}
            className="foco mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Corregir
          </button>
        )}
      </div>

      <span className="pastilla shrink-0">{ESTADOS_INCIDENTE[estado]}</span>
    </li>
  );
}

function FormularioCorreccion({
  tenantId,
  reporte,
  torres,
  zonas,
  esAdmin,
  onCerrar,
}: {
  tenantId: string;
  reporte: IncidentReport;
  torres: TorreConPisos[];
  zonas: OpcionLugar[];
  esAdmin: boolean;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoIncidente | null>(tipoIncidente(reporte.type) ?? null);
  /* Controlado porque el dictado tiene que poder escribir adentro. */
  const [descripcion, setDescripcion] = useState(reporte.description ?? '');

  function guardar(formData: FormData) {
    if (!tipo) {
      setError('Elegí qué pasó.');
      return;
    }
    setError(null);
    formData.set('type', tipo.slug);
    startTransition(async () => {
      const result = await editarReporteAction(tenantId, reporte.id, formData);
      if (!result.ok) setError(result.error);
      else {
        onCerrar();
        router.refresh();
      }
    });
  }

  return (
    <form action={guardar} className="superficie space-y-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">Corregir el reporte</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Se puede hasta que la administración lo tome.
          </p>
        </div>
        <button
          type="button"
          data-tactil
          onClick={onCerrar}
          aria-label="Cancelar la corrección"
          className="foco -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <SelectorTipo valor={tipo} onCambio={setTipo} />

      <SelectorLugar
        tenantId={tenantId}
        esAdmin={esAdmin}
        torres={torres}
        zonas={zonas}
        lugarIdInicial={reporte.locationId}
        textoInicial={reporte.location}
      />

      <div className="space-y-1.5">
        <label htmlFor={`description-${reporte.id}`} className="text-sm font-medium">
          Contá qué viste{' '}
          <span className="font-normal text-[var(--color-text-secondary)]">(opcional)</span>
        </label>
        <div className="flex items-start gap-2">
          <textarea
            id={`description-${reporte.id}`}
            name="description"
            rows={3}
            maxLength={1000}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Qué pasó y a qué hora."
            className="campo w-full flex-1 px-3 py-2.5 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
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

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          data-tactil
          disabled={isPending || !tipo}
          className="foco flex flex-1 items-center justify-center rounded-[var(--radio-control)] bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          data-tactil
          onClick={onCerrar}
          className="foco rounded-[var(--radio-control)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
