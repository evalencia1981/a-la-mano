'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Building,
  Check,
  ChevronDown,
  ChevronRight,
  EyeOff,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { ZONAS_SUGERIDAS, normalizarLugar } from '@/lib/location-types';
import {
  cambiarEstadoLugarAction,
  crearLugarAction,
  crearTorreConPisosAction,
  crearZonasAction,
  eliminarLugarAction,
  renombrarLugarAction,
} from '@/server/actions/location.actions';
import type { Location } from '@a-la-mano/db';

interface Torre {
  lugar: Location;
  hijos: Location[];
}

interface Pendiente {
  texto: string;
  cantidad: number;
  variantes: string[];
}

interface Props {
  tenantId: string;
  torres: Torre[];
  zonas: Location[];
  pendientes: Pendiente[];
}

export function MapaEditor({ tenantId, torres, zonas, pendientes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Toda mutación pasa por acá: mismo manejo de error, mismo refresh. */
  function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await accion();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const vacio = torres.length === 0 && zonas.length === 0;

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error)] px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      {vacio && <Bienvenida />}

      {/* Va primero cuando hay algo: es lo único de esta pantalla que tiene
          urgencia. Los vecinos ya reportaron en lugares que no existen. */}
      {pendientes.length > 0 && (
        <SeccionPendientes
          pendientes={pendientes}
          deshabilitado={isPending}
          onCrear={(nombre, kind) =>
            ejecutar(() => crearLugarAction(tenantId, kind, nombre, null))
          }
        />
      )}

      <SeccionTorres
        torres={torres}
        deshabilitado={isPending}
        onAgregarTorre={(nombre, pisos) =>
          ejecutar(() => crearTorreConPisosAction(tenantId, nombre, pisos))
        }
        onAgregarPiso={(torreId, nombre) =>
          ejecutar(() => crearLugarAction(tenantId, 'piso', nombre, torreId))
        }
        onRenombrar={(id, nombre) => ejecutar(() => renombrarLugarAction(tenantId, id, nombre))}
        onCambiarEstado={(id, activo) =>
          ejecutar(() => cambiarEstadoLugarAction(tenantId, id, activo))
        }
        onEliminar={(id) => ejecutar(() => eliminarLugarAction(tenantId, id))}
      />

      <SeccionZonas
        zonas={zonas}
        deshabilitado={isPending}
        onAgregar={(nombres) => ejecutar(() => crearZonasAction(tenantId, nombres))}
        onRenombrar={(id, nombre) => ejecutar(() => renombrarLugarAction(tenantId, id, nombre))}
        onCambiarEstado={(id, activo) =>
          ejecutar(() => cambiarEstadoLugarAction(tenantId, id, activo))
        }
        onEliminar={(id) => ejecutar(() => eliminarLugarAction(tenantId, id))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function Bienvenida() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-4">
      <h2 className="font-display text-base font-semibold">Todavía no cargaste el mapa</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Empezá por las torres —agregá una y decí cuántos pisos tiene, los pisos se crean
        solos— y después tocá las zonas comunes que ya vienen sugeridas. Con eso alcanza
        para arrancar; lo que falte se puede agregar después, incluso desde un reporte que
        mencione un lugar que no existe.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function SeccionPendientes({
  pendientes,
  deshabilitado,
  onCrear,
}: {
  pendientes: Pendiente[];
  deshabilitado: boolean;
  onCrear: (nombre: string, kind: 'torre' | 'zona') => void;
}) {
  return (
    <section className="rounded-xl border-2 border-[var(--color-urgencia)] bg-[var(--color-bg-primary)] p-4">
      <h2 className="font-display text-base font-semibold">Mencionados en reportes, sin cargar</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
        Alguien reportó algo acá y el lugar no está en el mapa. Al agregarlo, los reportes
        que lo mencionaban se enganchan solos y dejan de estar sueltos.
      </p>

      <ul className="mt-3 space-y-2">
        {pendientes.map((p) => (
          <li
            key={p.texto}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5"
          >
            <MapPin className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
            <span className="font-medium">{p.texto}</span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {p.cantidad} {p.cantidad === 1 ? 'reporte' : 'reportes'}
              {p.variantes.length > 1 && ` · escrito de ${p.variantes.length} formas`}
            </span>
            <span className="ml-auto flex gap-1.5">
              <button
                type="button"
                data-tactil
                disabled={deshabilitado}
                onClick={() => onCrear(p.texto, 'torre')}
                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
              >
                Es una torre
              </button>
              <button
                type="button"
                data-tactil
                disabled={deshabilitado}
                onClick={() => onCrear(p.texto, 'zona')}
                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
              >
                Es una zona
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------------- */

function SeccionTorres({
  torres,
  deshabilitado,
  onAgregarTorre,
  onAgregarPiso,
  onRenombrar,
  onCambiarEstado,
  onEliminar,
}: {
  torres: Torre[];
  deshabilitado: boolean;
  onAgregarTorre: (nombre: string, pisos: number) => void;
  onAgregarPiso: (torreId: string, nombre: string) => void;
  onRenombrar: (id: string, nombre: string) => void;
  onCambiarEstado: (id: string, activo: boolean) => void;
  onEliminar: (id: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [pisos, setPisos] = useState('');

  function agregar() {
    const limpio = nombre.trim();
    if (!limpio) return;
    onAgregarTorre(limpio, Number.parseInt(pisos, 10) || 0);
    setNombre('');
    setPisos('');
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
      <h2 className="font-display text-base font-semibold">Torres y bloques</h2>

      {torres.length > 0 && (
        <ul className="mt-3 space-y-2">
          {torres.map((t) => (
            <TorreItem
              key={t.lugar.id}
              torre={t}
              deshabilitado={deshabilitado}
              onAgregarPiso={onAgregarPiso}
              onRenombrar={onRenombrar}
              onCambiarEstado={onCambiarEstado}
              onEliminar={onEliminar}
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <label htmlFor="torre-nombre" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="torre-nombre"
            value={nombre}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
            placeholder="Torre 1, Bloque A…"
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
          />
        </div>
        <div className="w-28 space-y-1">
          <label htmlFor="torre-pisos" className="text-sm font-medium">
            Pisos
          </label>
          <input
            id="torre-pisos"
            value={pisos}
            inputMode="numeric"
            onChange={(e) => setPisos(e.target.value.replace(/\D/g, '').slice(0, 2))}
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
            placeholder="0"
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
          />
        </div>
        <button
          type="button"
          data-tactil
          disabled={deshabilitado || !nombre.trim()}
          onClick={agregar}
          className="flex h-11 items-center gap-1.5 rounded-lg bg-[var(--color-accent-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Agregar
        </button>
      </div>
      <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
        Si ponés la cantidad de pisos, se crean todos de una vez.
      </p>
    </section>
  );
}

function TorreItem({
  torre,
  deshabilitado,
  onAgregarPiso,
  onRenombrar,
  onCambiarEstado,
  onEliminar,
}: {
  torre: Torre;
  deshabilitado: boolean;
  onAgregarPiso: (torreId: string, nombre: string) => void;
  onRenombrar: (id: string, nombre: string) => void;
  onCambiarEstado: (id: string, activo: boolean) => void;
  onEliminar: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [nuevoPiso, setNuevoPiso] = useState('');
  const Chevron = abierta ? ChevronDown : ChevronRight;

  return (
    <li className="rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <Chevron className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
          <Building className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
          <NombreLugar lugar={torre.lugar} deshabilitado={deshabilitado} onRenombrar={onRenombrar} />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {torre.hijos.length > 0 &&
              `${torre.hijos.length} ${torre.hijos.length === 1 ? 'piso' : 'pisos'}`}
          </span>
        </button>
        <Acciones
          lugar={torre.lugar}
          deshabilitado={deshabilitado}
          onCambiarEstado={onCambiarEstado}
          onEliminar={onEliminar}
        />
      </div>

      {abierta && (
        <div className="space-y-2 border-t border-[var(--color-border)] px-3 py-2.5 pl-9">
          {torre.hijos.map((piso) => (
            <div key={piso.id} className="flex items-center gap-2">
              <NombreLugar lugar={piso} deshabilitado={deshabilitado} onRenombrar={onRenombrar} />
              <div className="ml-auto">
                <Acciones
                  lugar={piso}
                  deshabilitado={deshabilitado}
                  onCambiarEstado={onCambiarEstado}
                  onEliminar={onEliminar}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <input
              value={nuevoPiso}
              maxLength={80}
              onChange={(e) => setNuevoPiso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !nuevoPiso.trim()) return;
                onAgregarPiso(torre.lugar.id, nuevoPiso.trim());
                setNuevoPiso('');
              }}
              placeholder="Piso 6, Sótano, Terraza…"
              aria-label={`Agregar piso a ${torre.lugar.name}`}
              className="h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-sm outline-none transition-colors focus:border-[var(--color-text-primary)]"
            />
            <button
              type="button"
              data-tactil
              disabled={deshabilitado || !nuevoPiso.trim()}
              onClick={() => {
                onAgregarPiso(torre.lugar.id, nuevoPiso.trim());
                setNuevoPiso('');
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              Agregar piso
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------------- */

function SeccionZonas({
  zonas,
  deshabilitado,
  onAgregar,
  onRenombrar,
  onCambiarEstado,
  onEliminar,
}: {
  zonas: Location[];
  deshabilitado: boolean;
  onAgregar: (nombres: string[]) => void;
  onRenombrar: (id: string, nombre: string) => void;
  onCambiarEstado: (id: string, activo: boolean) => void;
  onEliminar: (id: string) => void;
}) {
  const [nombre, setNombre] = useState('');

  /* Solo se ofrecen las que faltan: un chip que no hace nada al tocarlo
     enseña a desconfiar de todos los demás. */
  const yaCargadas = new Set(zonas.map((z) => z.normalized));
  const sugeridas = ZONAS_SUGERIDAS.filter((s) => !yaCargadas.has(normalizarLugar(s)));

  function agregar() {
    const limpio = nombre.trim();
    if (!limpio) return;
    onAgregar([limpio]);
    setNombre('');
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
      <h2 className="font-display text-base font-semibold">Zonas comunes</h2>

      {zonas.length > 0 && (
        <ul className="mt-3 space-y-2">
          {zonas.map((z) => (
            <li
              key={z.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
              <NombreLugar lugar={z} deshabilitado={deshabilitado} onRenombrar={onRenombrar} />
              <div className="ml-auto">
                <Acciones
                  lugar={z}
                  deshabilitado={deshabilitado}
                  onCambiarEstado={onCambiarEstado}
                  onEliminar={onEliminar}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {sugeridas.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Tocá las que tenga la unidad:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugeridas.map((s) => (
              <button
                key={s}
                type="button"
                data-tactil
                disabled={deshabilitado}
                onClick={() => onAgregar([s])}
                className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={nombre}
          maxLength={80}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()}
          placeholder="Otra zona…"
          aria-label="Agregar otra zona común"
          className="h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
        />
        <button
          type="button"
          data-tactil
          disabled={deshabilitado || !nombre.trim()}
          onClick={agregar}
          className="rounded-lg border border-[var(--color-border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
        >
          Agregar
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */

/** Nombre con edición en el lugar: un clic en el lápiz y ya se escribe. */
function NombreLugar({
  lugar,
  deshabilitado,
  onRenombrar,
}: {
  lugar: Location;
  deshabilitado: boolean;
  onRenombrar: (id: string, nombre: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(lugar.name);

  if (editando) {
    return (
      <span className="flex flex-1 items-center gap-1.5">
        <input
          autoFocus
          value={valor}
          maxLength={80}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valor.trim()) {
              onRenombrar(lugar.id, valor.trim());
              setEditando(false);
            }
            if (e.key === 'Escape') {
              setValor(lugar.name);
              setEditando(false);
            }
          }}
          className="h-9 flex-1 rounded-lg border border-[var(--color-text-primary)] bg-[var(--color-bg-primary)] px-2 text-sm outline-none"
        />
        <button
          type="button"
          aria-label="Guardar nombre"
          disabled={deshabilitado || !valor.trim()}
          onClick={() => {
            onRenombrar(lugar.id, valor.trim());
            setEditando(false);
          }}
          className="rounded p-1.5 hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
        >
          <Check className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Cancelar"
          onClick={() => {
            setValor(lugar.name);
            setEditando(false);
          }}
          className="rounded p-1.5 hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className={lugar.isActive ? 'font-medium' : 'font-medium line-through opacity-50'}>
        {lugar.name}
      </span>
      {!lugar.isActive && (
        <span className="text-xs text-[var(--color-text-secondary)]">(dado de baja)</span>
      )}
      <button
        type="button"
        aria-label={`Renombrar ${lugar.name}`}
        disabled={deshabilitado}
        onClick={(e) => {
          e.stopPropagation();
          setEditando(true);
        }}
        className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

/**
 * Dar de baja y borrar son cosas distintas y acá se ven distintas: borrar
 * solo funciona si nadie mencionó el lugar todavía. El service lo rechaza
 * igual, pero el que decide tiene que entender por qué antes de intentarlo.
 */
function Acciones({
  lugar,
  deshabilitado,
  onCambiarEstado,
  onEliminar,
}: {
  lugar: Location;
  deshabilitado: boolean;
  onCambiarEstado: (id: string, activo: boolean) => void;
  onEliminar: (id: string) => void;
}) {
  return (
    <span className="flex shrink-0 gap-0.5">
      <button
        type="button"
        aria-label={lugar.isActive ? `Dar de baja ${lugar.name}` : `Reactivar ${lugar.name}`}
        title={lugar.isActive ? 'Dar de baja' : 'Reactivar'}
        disabled={deshabilitado}
        onClick={() => onCambiarEstado(lugar.id, !lugar.isActive)}
        className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
      >
        {lugar.isActive ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Undo2 className="h-4 w-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        aria-label={`Borrar ${lugar.name}`}
        title="Borrar"
        disabled={deshabilitado}
        onClick={() => onEliminar(lugar.id)}
        className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </span>
  );
}
