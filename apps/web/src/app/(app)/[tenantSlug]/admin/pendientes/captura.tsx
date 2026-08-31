'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { Check, MapPin, Plus, Send, Star } from 'lucide-react';
import { BotonMicrofono } from '@/components/shared/boton-microfono';
import {
  interpretarPendiente,
  type CategoriaDisponible,
} from '@/lib/interpretar-pendiente';
import type { LugarOpcion } from '@/lib/location-types';
import { compararPorCalificacion, estaAvalado } from '@/lib/rating';
import {
  crearTareaAction,
  crearYPedirCotizacionAction,
} from '@/server/actions/task.actions';

interface Opcion {
  id: string;
  name: string;
}

interface ProveedorVista extends Opcion {
  tieneWhatsapp: boolean;
  categoriaSlug: string;
  categoriaNombre: string;
  promedio: number;
  calificaciones: number;
}

interface Props {
  tenantId: string;
  puestos: Array<Opcion & { tieneWhatsapp: boolean }>;
  /** Del directorio de la comunidad. Externos, no personal de la unidad. */
  proveedores: ProveedorVista[];
  /** Solo las que tienen algún proveedor cargado. */
  categorias: CategoriaDisponible[];
  lugares: Opcion[];
  /** El mapa aplanado, para reconocer el lugar dentro de lo dictado. */
  opcionesLugar: LugarOpcion[];
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
export function Captura({
  tenantId,
  puestos,
  proveedores,
  categorias,
  lugares,
  opcionesLugar,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState('');
  const [puestoId, setPuestoId] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState<string | null>(null);
  const [lugarId, setLugarId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardados, setGuardados] = useState(0);
  /** Cuando se pidió ver todos los proveedores, no solo los que calzan. */
  const [verTodos, setVerTodos] = useState(false);

  /* Se interpreta en el cliente, sin ida al servidor: es una función pura
     sobre datos que ya están en la página, y tiene que sentirse instantáneo
     mientras se dicta. */
  const interpretacion = useMemo(
    () => interpretarPendiente(texto, opcionesLugar, categorias),
    [texto, opcionesLugar, categorias],
  );

  /* Los que calzan con lo dictado van primero. Si no calzó nada, se ofrecen
     todos: no saber a quién llamar no puede dejar la pantalla vacía. */
  const sugeridos = useMemo(() => {
    const base =
      verTodos || interpretacion.categorias.length === 0
        ? proveedores
        : proveedores.filter((p) => interpretacion.categorias.includes(p.categoriaSlug));
    const elegibles = base.length > 0 ? base : proveedores;
    /* El mejor calificado primero. Es el sentido entero del directorio: el
       vecino califica para que el que decide sepa a quién llamar. */
    return [...elegibles].sort(compararPorCalificacion);
  }, [proveedores, interpretacion.categorias, verTodos]);

  const preguntandoProveedor =
    interpretacion.quiereProveedor && texto.trim().length > 0 && proveedores.length > 0;

  function guardar() {
    const title = texto.trim();
    if (!title) return;
    setError(null);

    startTransition(async () => {
      const result = await crearTareaAction(tenantId, {
        title,
        positionId: puestoId,
        communityProviderId: proveedorId,
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

  function guardarYCotizar(proveedor: ProveedorVista) {
    const title = texto.trim();
    if (!title) return;
    setError(null);

    startTransition(async () => {
      const result = await crearYPedirCotizacionAction(
        tenantId,
        { title, locationId: interpretacion.lugar?.id ?? lugarId },
        proveedor.id,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      /* El envío lo hace la persona desde su WhatsApp: nosotros solo abrimos
         el chat con el mensaje ya escrito. */
      if (result.data.urlWhatsapp) window.open(result.data.urlWhatsapp, '_blank', 'noopener');
      else if (result.data.errorDespacho) setError(result.data.errorDespacho);
      else setError(`${proveedor.name} no tiene WhatsApp cargado. El pendiente igual quedó guardado.`);

      setTexto('');
      setVerTodos(false);
      setGuardados((n) => n + 1);
      inputRef.current?.focus();
      router.refresh();
    });
  }

  return (
    <section className="superficie p-4">
      {/* En el teléfono el campo se lleva la primera fila entera y el
          micrófono con Guardar bajan a la segunda: apretados en una sola
          línea, el campo quedaba en la mitad del ancho y el botón de dictar
          era imposible de acertar caminando. */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          autoFocus
          value={texto}
          maxLength={200}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          placeholder="Torre 2 cambiar lámpara del corredor, electricidad…"
          aria-label="Qué hay que hacer"
          className="h-12 w-full min-w-0 basis-full campo px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)] sm:w-auto sm:flex-1 sm:basis-0"
        />
        <BotonMicrofono
          valor={texto}
          onCambio={setTexto}
          etiqueta="Dictar el pendiente"
          onError={setError}
          deshabilitado={isPending}
        />
        <button
          type="button"
          data-tactil
          disabled={isPending || !texto.trim()}
          onClick={guardar}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[var(--radio-panel)] bg-[var(--color-accent-primary)] px-4 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:flex-none sm:text-sm"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Lo que se entendió de lo dictado. Aparece solo cuando se pidió
          contactar a alguien: si no, estorba. */}
      {preguntandoProveedor && (
        <div className="mt-3 rounded-[var(--radio-panel)] border-2 border-[var(--color-accent-primary)] p-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">
              {interpretacion.pidioExplicito
                ? '¿A quién le pedís cotización?'
                : '¿Se lo pedís a un proveedor?'}
            </span>
            {interpretacion.lugar && (
              <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {interpretacion.lugar.rutaCompleta}
              </span>
            )}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugeridos.map((p) => (
              <button
                key={p.id}
                type="button"
                data-tactil
                disabled={isPending}
                onClick={() => guardarYCotizar(p)}
                className="flex max-w-full items-center gap-1.5 rounded-[var(--radio-ficha)] border border-[var(--color-border)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-xs text-[var(--color-text-secondary)]">
                    {p.categoriaNombre}
                    {' · '}
                    <Calificacion
                      promedio={p.promedio}
                      calificaciones={p.calificaciones}
                    />
                  </span>
                </span>
              </button>
            ))}
          </div>

          {!verTodos && sugeridos.length < proveedores.length && (
            <button
              type="button"
              onClick={() => setVerTodos(true)}
              className="mt-2 text-sm text-[var(--color-text-secondary)] underline underline-offset-2"
            >
              Ver los {proveedores.length} proveedores
            </button>
          )}

          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Al elegir uno se guarda el pendiente y se abre WhatsApp con la solicitud escrita.
          </p>
        </div>
      )}

      {puestos.length > 0 && (
        <Fila
          etiqueta="Para"
          opciones={puestos}
          elegido={puestoId}
          onElegir={(id) => {
            setPuestoId(id);
            /* Excluyentes: o lo hace la gente de la unidad, o se contrata
               afuera. Elegir uno suelta el otro. */
            if (id) setProveedorId(null);
          }}
          deshabilitado={isPending}
        />
      )}

      {proveedores.length > 0 && (
        <Fila
          etiqueta="Proveedor"
          opciones={proveedores}
          elegido={proveedorId}
          onElegir={(id) => {
            setProveedorId(id);
            if (id) setPuestoId(null);
          }}
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

/**
 * La calificación de la comunidad, en el mínimo espacio posible.
 *
 * Muestra siempre cuántas opiniones hay, no solo el promedio: un 5,0 con una
 * sola opinión y un 4,6 con veinte se ven igual si se omite el número, y no
 * significan lo mismo cuando hay que decidir a quién contratar.
 */
function Calificacion({
  promedio,
  calificaciones,
}: {
  promedio: number;
  calificaciones: number;
}) {
  if (calificaciones === 0) return <span>sin calificar</span>;

  return (
    <span
      className={estaAvalado(calificaciones) ? 'font-medium' : undefined}
      style={estaAvalado(calificaciones) ? { color: 'var(--color-text-primary)' } : undefined}
    >
      <Star className="mb-0.5 inline h-3 w-3" aria-hidden />{' '}
      {promedio.toFixed(1).replace('.', ',')} ({calificaciones})
    </span>
  );
}
