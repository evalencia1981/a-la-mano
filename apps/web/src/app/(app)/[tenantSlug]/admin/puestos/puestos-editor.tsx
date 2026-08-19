'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { EyeOff, Phone, PhoneOff, Plus, Trash2, Undo2 } from 'lucide-react';
import { iconoDe } from '@/lib/category-icons';
import { normalizarLugar } from '@/lib/location-types';
import { PUESTOS_SUGERIDOS } from '@/lib/task-types';
import {
  actualizarPuestoAction,
  cambiarEstadoPuestoAction,
  crearPuestosAction,
  eliminarPuestoAction,
} from '@/server/actions/position.actions';

interface PuestoVista {
  id: string;
  name: string;
  normalized: string;
  phone: string | null;
  icon: string | null;
  isActive: boolean;
  abiertas: number;
}

interface Props {
  tenantId: string;
  puestos: PuestoVista[];
}

export function PuestosEditor({ tenantId, puestos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');

  function ejecutar(accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await accion();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const yaCreados = new Set(puestos.map((p) => p.normalized));
  const sugeridos = PUESTOS_SUGERIDOS.filter((s) => !yaCreados.has(normalizarLugar(s.name)));

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error)] px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      {puestos.length > 0 && (
        <ul className="space-y-2">
          {puestos.map((p) => (
            <PuestoItem
              key={p.id}
              puesto={p}
              deshabilitado={isPending}
              onGuardar={(name, phone) =>
                ejecutar(() => actualizarPuestoAction(tenantId, p.id, { name, phone }))
              }
              onCambiarEstado={(activo) =>
                ejecutar(() => cambiarEstadoPuestoAction(tenantId, p.id, activo))
              }
              onEliminar={() => ejecutar(() => eliminarPuestoAction(tenantId, p.id))}
            />
          ))}
        </ul>
      )}

      {sugeridos.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Tocá los que tenga la unidad. El teléfono se carga después.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sugeridos.map((s) => (
              <button
                key={s.name}
                type="button"
                data-tactil
                disabled={isPending}
                onClick={() => ejecutar(() => crearPuestosAction(tenantId, [s]))}
                className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {s.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={nombre}
              maxLength={60}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !nombre.trim()) return;
                ejecutar(() => crearPuestosAction(tenantId, [{ name: nombre.trim() }]));
                setNombre('');
              }}
              placeholder="Otro puesto…"
              aria-label="Agregar otro puesto"
              className="h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-base outline-none transition-colors focus:border-[var(--color-text-primary)]"
            />
            <button
              type="button"
              data-tactil
              disabled={isPending || !nombre.trim()}
              onClick={() => {
                ejecutar(() => crearPuestosAction(tenantId, [{ name: nombre.trim() }]));
                setNombre('');
              }}
              className="rounded-lg border border-[var(--color-border)] px-4 text-sm font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PuestoItem({
  puesto,
  deshabilitado,
  onGuardar,
  onCambiarEstado,
  onEliminar,
}: {
  puesto: PuestoVista;
  deshabilitado: boolean;
  onGuardar: (name: string, phone: string) => void;
  onCambiarEstado: (activo: boolean) => void;
  onEliminar: () => void;
}) {
  const [name, setName] = useState(puesto.name);
  const [phone, setPhone] = useState(puesto.phone ?? '');
  const Icono = iconoDe(puesto.icon ?? 'briefcase');

  const sucio = name.trim() !== puesto.name || phone.trim() !== (puesto.phone ?? '');

  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icono
          className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]"
          aria-hidden
        />
        <input
          value={name}
          maxLength={60}
          disabled={deshabilitado}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Nombre de ${puesto.name}`}
          className={`h-10 min-w-32 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-base font-medium outline-none transition-colors hover:border-[var(--color-border)] focus:border-[var(--color-text-primary)] ${
            puesto.isActive ? '' : 'line-through opacity-50'
          }`}
        />

        <label className="flex items-center gap-1.5">
          <span className="sr-only">WhatsApp de {puesto.name}</span>
          {puesto.phone ? (
            <Phone className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden />
          ) : (
            <PhoneOff className="h-4 w-4 shrink-0 text-[var(--color-urgencia)]" aria-hidden />
          )}
          <input
            value={phone}
            maxLength={30}
            inputMode="tel"
            disabled={deshabilitado}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp (573001234567)"
            className="h-10 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 text-sm outline-none transition-colors focus:border-[var(--color-text-primary)]"
          />
        </label>

        {sucio && (
          <button
            type="button"
            data-tactil
            disabled={deshabilitado || !name.trim()}
            onClick={() => onGuardar(name.trim(), phone.trim())}
            className="rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        )}

        <span className="flex shrink-0 gap-0.5">
          <button
            type="button"
            aria-label={puesto.isActive ? `Dar de baja ${puesto.name}` : `Reactivar ${puesto.name}`}
            title={puesto.isActive ? 'Dar de baja' : 'Reactivar'}
            disabled={deshabilitado}
            onClick={() => onCambiarEstado(!puesto.isActive)}
            className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
          >
            {puesto.isActive ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Undo2 className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            aria-label={`Borrar ${puesto.name}`}
            title="Borrar"
            disabled={deshabilitado}
            onClick={onEliminar}
            className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>

      <p className="mt-1.5 pl-7 text-xs text-[var(--color-text-secondary)]">
        {puesto.abiertas > 0
          ? `${puesto.abiertas} ${puesto.abiertas === 1 ? 'pendiente abierto' : 'pendientes abiertos'}`
          : 'Sin pendientes abiertos'}
        {!puesto.phone && ' · sin WhatsApp cargado, no se le puede despachar'}
      </p>
    </li>
  );
}
