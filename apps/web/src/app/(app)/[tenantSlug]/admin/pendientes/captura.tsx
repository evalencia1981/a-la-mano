'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Check, Plus } from 'lucide-react';
import { crearTareaAction } from '@/server/actions/task.actions';

interface Opcion {
  id: string;
  name: string;
}

interface Props {
  tenantId: string;
  puestos: Array<Opcion & { tieneWhatsapp: boolean }>;
  lugares: Opcion[];
}

/**
 * Meter un pendiente.
 *
 * Es la pantalla que decide si el producto sirve. El administrador tiene el
 * problema resuelto hoy —dicta un audio de WhatsApp en tres segundos— y lo
 * único que le falta es que después no se le pierda. Si acá le pedimos
 * cuatro campos, vuelve al audio y no hay nada que hacer.
 *
 * Por eso: un campo, y guardar. El puesto y el lugar están a un toque pero
 * no se piden; el input se limpia y se queda enfocado para que el segundo
 * pendiente entre sin volver a tocar nada, que es el caso real —llega a la
 * unidad y encuentra cinco cosas de una.
 */
export function Captura({ tenantId, puestos, lugares }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState('');
  const [puestoId, setPuestoId] = useState<string | null>(null);
  const [lugarId, setLugarId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardados, setGuardados] = useState(0);

  function guardar() {
    const title = texto.trim();
    if (!title) return;
    setError(null);

    startTransition(async () => {
      const result = await crearTareaAction(tenantId, {
        title,
        positionId: puestoId,
        locationId: lugarId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTexto('');
      setGuardados((n) => n + 1);
      /* El puesto y el lugar NO se limpian: los cinco pendientes que
         encuentra al llegar suelen ser de la misma torre y del mismo
         responsable. Limpiarlos obligaría a volver a tocarlos cada vez. */
      inputRef.current?.focus();
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={texto}
          maxLength={200}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          placeholder="Mal aseo torre 1, grieta ventana apto 505…"
          aria-label="Qué hay que hacer"
          className="h-12 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
        />
        <button
          type="button"
          data-tactil
          disabled={isPending || !texto.trim()}
          onClick={guardar}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {puestos.length > 0 && (
        <Fila
          etiqueta="Para"
          opciones={puestos}
          elegido={puestoId}
          onElegir={setPuestoId}
          deshabilitado={isPending}
        />
      )}

      {lugares.length > 0 && (
        <Fila
          etiqueta="Dónde"
          opciones={lugares}
          elegido={lugarId}
          onElegir={setLugarId}
          deshabilitado={isPending}
        />
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      {guardados > 0 && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
          <Check className="h-4 w-4" style={{ color: 'var(--color-success)' }} aria-hidden />
          {guardados === 1 ? 'Guardado.' : `${guardados} guardados.`} Seguí escribiendo el
          siguiente.
        </p>
      )}

      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        Con el texto alcanza. El puesto y el lugar son opcionales y se pueden completar
        después.
      </p>
    </section>
  );
}

function Fila({
  etiqueta,
  opciones,
  elegido,
  onElegir,
  deshabilitado,
}: {
  etiqueta: string;
  opciones: Opcion[];
  elegido: string | null;
  onElegir: (id: string | null) => void;
  deshabilitado: boolean;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {etiqueta}
      </span>
      {opciones.map((o) => {
        const activo = elegido === o.id;
        return (
          <button
            key={o.id}
            type="button"
            data-tactil
            disabled={deshabilitado}
            aria-pressed={activo}
            onClick={() => onElegir(activo ? null : o.id)}
            className={`rounded-full border px-2.5 py-1 text-sm transition-colors disabled:opacity-40 ${
              activo
                ? 'border-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] font-medium'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
            }`}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}
