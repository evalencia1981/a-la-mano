'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { BotonMicrofono } from '@/components/shared/boton-microfono';
import { normalizarLugar } from '@/lib/location-types';
import { crearLugarAction } from '@/server/actions/location.actions';

export interface OpcionLugar {
  id: string;
  name: string;
}

export interface TorreConPisos {
  lugar: OpcionLugar;
  hijos: OpcionLugar[];
}

interface Props {
  tenantId: string;
  /** Owner o admin: son los únicos que pueden tocar el mapa. */
  esAdmin: boolean;
  torres: TorreConPisos[];
  zonas: OpcionLugar[];
}

/**
 * Dónde pasó.
 *
 * Es un selector de chips y no un desplegable ni un campo de texto porque
 * se usa de pie, caminando, con una mano — el mismo criterio con el que
 * está armada la grilla de tipos de arriba.
 *
 * Dos reglas que no se negocian:
 *
 *  - **Nunca bloquea.** Si el lugar no está en el mapa se escribe a mano y
 *    el reporte se manda igual. La administración lo ve después en la lista
 *    de pendientes por mapear.
 *  - **Al administrador se le ofrece crearlo ahí mismo.** Si él está
 *    caminando la unidad y menciona "Torre 3" y esa torre no existe, la
 *    agrega de un toque y sigue. Mandarlo a otra pantalla a mitad de un
 *    reporte es garantía de que no lo hace nunca.
 */
export function SelectorLugar({ tenantId, esAdmin, torres, zonas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lugarId, setLugarId] = useState<string | null>(null);
  const [torreAbierta, setTorreAbierta] = useState<string | null>(null);
  const [modoLibre, setModoLibre] = useState(false);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* Lo que se acaba de crear desde acá. Existe para que el chip aparezca
     seleccionado al instante, sin esperar a que el server component se
     vuelva a renderizar. */
  const [recienCreadas, setRecienCreadas] = useState<OpcionLugar[]>([]);

  const zonasVisibles = useMemo(() => {
    const ids = new Set(zonas.map((z) => z.id));
    return [...zonas, ...recienCreadas.filter((r) => !ids.has(r.id))];
  }, [zonas, recienCreadas]);

  const hayMapa = torres.length > 0 || zonasVisibles.length > 0;

  /* Todo lo que existe, para saber si lo tecleado ya está en el mapa. */
  const clavesExistentes = useMemo(() => {
    const claves = new Set<string>();
    for (const t of torres) {
      claves.add(normalizarLugar(t.lugar.name));
      for (const p of t.hijos) claves.add(normalizarLugar(`${t.lugar.name} ${p.name}`));
    }
    for (const z of zonasVisibles) claves.add(normalizarLugar(z.name));
    return claves;
  }, [torres, zonasVisibles]);

  const textoLimpio = texto.trim();
  const desconocido = textoLimpio.length > 1 && !clavesExistentes.has(normalizarLugar(textoLimpio));

  /* "Torre 3" es una torre; "Cancha auxiliar" es una zona. Si le erra, se
     corrige en el mapa — vale más no interrumpir el reporte con una
     pregunta que acertar el tipo el 100% de las veces. */
  const kindSugerido: 'torre' | 'zona' = /^(torre|bloque)/.test(normalizarLugar(textoLimpio))
    ? 'torre'
    : 'zona';

  function elegir(id: string) {
    setLugarId((actual) => (actual === id ? null : id));
    setModoLibre(false);
    setTexto('');
  }

  function crearYElegir() {
    setError(null);
    startTransition(async () => {
      const result = await crearLugarAction(tenantId, kindSugerido, textoLimpio, null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const creada = { id: result.data.lugar.id, name: result.data.lugar.name };
      setRecienCreadas((prev) => [...prev, creada]);
      setLugarId(creada.id);
      setModoLibre(false);
      setTexto('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">
        ¿Dónde? <span className="font-normal text-[var(--color-text-secondary)]">(opcional)</span>
      </span>

      {/* Lo que efectivamente viaja al server. */}
      <input type="hidden" name="locationId" value={lugarId ?? ''} />
      <input type="hidden" name="location" value={lugarId ? '' : textoLimpio} />

      {hayMapa && !modoLibre && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {torres.map((t) => (
              <Chip
                key={t.lugar.id}
                activo={lugarId === t.lugar.id || torreAbierta === t.lugar.id}
                onClick={() => {
                  elegir(t.lugar.id);
                  setTorreAbierta((a) => (a === t.lugar.id ? null : t.lugar.id));
                }}
              >
                {t.lugar.name}
              </Chip>
            ))}
            {zonasVisibles.map((z) => (
              <Chip
                key={z.id}
                activo={lugarId === z.id}
                onClick={() => {
                  elegir(z.id);
                  setTorreAbierta(null);
                }}
              >
                {z.name}
              </Chip>
            ))}
          </div>

          {/* Los pisos aparecen solo cuando ya se eligió la torre: mostrar
              cuarenta chips de entrada no ayuda a nadie. */}
          {torreAbierta && (
            <div className="flex flex-wrap gap-1.5 border-l-2 border-[var(--color-border)] pl-2.5">
              {(torres.find((t) => t.lugar.id === torreAbierta)?.hijos ?? []).map((p) => (
                <Chip key={p.id} activo={lugarId === p.id} onClick={() => setLugarId(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setModoLibre(true);
              setLugarId(null);
              setTorreAbierta(null);
            }}
            className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2"
          >
            No está en la lista
          </button>
        </>
      )}

      {(!hayMapa || modoLibre) && (
        <>
          <div className="flex gap-2">
            <input
              name="lugar-libre"
              value={texto}
              maxLength={120}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Torre 3, parqueadero sótano 1, gimnasio…"
              aria-label="Dónde pasó"
              className="h-12 flex-1 campo px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
            />
            <BotonMicrofono
              valor={texto}
              onCambio={setTexto}
              etiqueta="Dictar el lugar"
              onError={setError}
              deshabilitado={isPending}
            />
          </div>

          {desconocido && esAdmin && (
            <button
              type="button"
              data-tactil
              disabled={isPending}
              onClick={crearYElegir}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radio-panel)] border-2 border-dashed border-[var(--color-accent-primary)] px-3 py-2.5 text-sm font-medium text-[var(--color-accent-primary)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {isPending
                ? 'Agregando…'
                : `Agregar «${textoLimpio}» al mapa como ${kindSugerido}`}
            </button>
          )}

          {desconocido && !esAdmin && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Ese lugar todavía no está en el mapa de la comunidad. El reporte se manda igual
              y la administración lo va a ver.
            </p>
          )}

          {hayMapa && (
            <button
              type="button"
              onClick={() => {
                setModoLibre(false);
                setTexto('');
              }}
              className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2"
            >
              Volver a la lista
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      {!hayMapa && esAdmin && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Todavía no cargaste el mapa de la unidad. Podés agregar los lugares desde acá a
          medida que reportás, o cargarlos de una vez en Administración → Mapa de la unidad.
        </p>
      )}

      <p className="text-xs text-[var(--color-text-secondary)]">
        Cuanto más preciso, mejor: es lo que permite ver dónde se repite.
      </p>
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-tactil
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-colors foco ${
        activo
          ? 'border-[var(--color-text-primary)] bg-[var(--color-bg-secondary)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
      }`}
    >
      {children}
    </button>
  );
}
