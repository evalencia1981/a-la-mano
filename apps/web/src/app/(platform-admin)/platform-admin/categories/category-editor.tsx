'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { ProviderAvatar } from '@/components/provider/provider-avatar';
import { colorDeGrupo } from '@/lib/category-groups';
import { ICONOS_POR_RUBRO } from '@/lib/category-icons';
import {
  createCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
} from '@/server/actions/category.actions';
import type { Category } from '@a-la-mano/db';

/**
 * Alta y edición del catálogo global de categorías.
 *
 * El mismo formulario sirve para crear y para editar: son los mismos campos
 * y las mismas reglas, y mantener dos versiones de lo mismo garantiza que se
 * desincronicen.
 *
 * No hay borrar. Las categorías tienen proveedores colgando; una desactivada
 * deja de ofrecerse al cargar proveedores nuevos, pero los que ya existen
 * siguen funcionando.
 */
export function CategoryEditor({
  grupos,
  categorias,
}: {
  grupos: readonly string[];
  categorias: Category[];
}) {
  const router = useRouter();
  /* null = cerrado · 'nueva' = alta · Category = editando esa */
  const [formulario, setFormulario] = useState<Category | 'nueva' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editando = formulario !== null && formulario !== 'nueva' ? formulario : null;
  const [icono, setIcono] = useState<string>('wrench');
  const [grupo, setGrupo] = useState<string>(grupos[0] ?? 'Otros');
  const [grupoNuevo, setGrupoNuevo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /* Todos los grupos en uso, no solo los cinco originales: si alguien creó
   * "Belleza y cuidado personal", tiene que poder volver a elegirlo. */
  const gruposEnUso = useMemo(() => {
    const todos = new Set<string>(grupos);
    for (const c of categorias) todos.add(c.groupName);
    return [...todos].sort();
  }, [grupos, categorias]);

  /* El formulario vive arriba de una tabla larga: sin esto, tocar "Editar"
   * en la última fila parece no hacer nada porque el formulario queda fuera
   * de la pantalla. */
  function enfocarFormulario() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    });
  }

  function abrirNueva() {
    setError(null);
    setIcono('wrench');
    setGrupo(grupos[0] ?? 'Otros');
    setGrupoNuevo(false);
    setFormulario('nueva');
    enfocarFormulario();
  }

  function abrirEdicion(c: Category) {
    setError(null);
    setIcono(c.iconName ?? 'wrench');
    setGrupo(c.groupName);
    setGrupoNuevo(false);
    setFormulario(c);
    enfocarFormulario();
  }

  function guardar(formData: FormData) {
    setError(null);
    if (!grupo.trim()) {
      setError('Poné un nombre al grupo.');
      return;
    }
    formData.set('iconName', icono);
    formData.set('groupName', grupo.trim());
    startTransition(async () => {
      const result = editando
        ? await updateCategoryAction(editando.id, formData)
        : await createCategoryAction(formData);
      if (!result.ok) setError(result.error);
      else {
        setFormulario(null);
        router.refresh();
      }
    });
  }

  function alternar(categoria: Category) {
    setError(null);
    startTransition(async () => {
      const result = await setCategoryActiveAction(categoria.id, !categoria.isActive);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {formulario === null ? (
        <button
          type="button"
          data-tactil
          onClick={abrirNueva}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      ) : (
        <form
          ref={formRef}
          /* Remonta al cambiar de categoría: sin esto los `defaultValue`
             quedarían con los datos de la anterior. */
          key={editando?.id ?? 'nueva'}
          action={guardar}
          className="space-y-4 rounded-xl border-2 border-[var(--color-accent-primary)] bg-[var(--color-bg-primary)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {editando ? `Editar ${editando.name}` : 'Nueva categoría'}
              </h2>
              {editando && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  El identificador <code>{editando.slug}</code> no cambia: ya está en los
                  enlaces del directorio de cada comunidad.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFormulario(null)}
              aria-label="Cancelar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={80}
                defaultValue={editando?.name ?? ''}
                placeholder="Manicura y pestañas"
                className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-[15px] outline-none transition-colors focus:border-[var(--color-text-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="groupName" className="text-sm font-medium">
                Grupo
              </label>
              {grupoNuevo ? (
                <div className="flex gap-2">
                  <input
                    id="groupName"
                    autoFocus
                    maxLength={80}
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    placeholder="Belleza y cuidado personal"
                    className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-[15px] outline-none transition-colors focus:border-[var(--color-text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGrupoNuevo(false);
                      setGrupo(editando?.groupName ?? grupos[0] ?? 'Otros');
                    }}
                    className="shrink-0 rounded-lg px-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  id="groupName"
                  value={grupo}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') {
                      setGrupo('');
                      setGrupoNuevo(true);
                    } else {
                      setGrupo(e.target.value);
                    }
                  }}
                  className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-[15px] outline-none transition-colors focus:border-[var(--color-text-primary)]"
                >
                  {gruposEnUso.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__nuevo__">+ Crear un grupo nuevo…</option>
                </select>
              )}
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorDeGrupo(grupo) }}
                />
                Este es el color con que se agrupa en el directorio.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Descripción (opcional)
            </label>
            <input
              id="description"
              name="description"
              maxLength={300}
              defaultValue={editando?.description ?? ''}
              placeholder="Servicio a domicilio de uñas y pestañas"
              className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 text-[15px] outline-none transition-colors focus:border-[var(--color-text-primary)]"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Ícono</legend>
            <p className="-mt-1 text-xs text-[var(--color-text-secondary)]">
              Es lo que se ve en la ficha cuando el proveedor todavía no subió fotos.
            </p>
            {ICONOS_POR_RUBRO.map(({ rubro, iconos }) => (
              <div key={rubro} className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {rubro}
                </span>
                <div className="flex flex-wrap gap-2">
                  {iconos.map((nombre) => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setIcono(nombre)}
                      aria-label={nombre}
                      aria-pressed={icono === nombre}
                      title={nombre}
                      className={`overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] ${
                        icono === nombre
                          ? 'border-[var(--color-text-primary)] scale-105'
                          : 'border-transparent opacity-55 hover:opacity-100'
                      }`}
                    >
                      <ProviderAvatar
                        photo={null}
                        category={{ iconName: nombre, groupName: grupo }}
                        nombre={nombre}
                        className="h-10 w-10"
                        tamañoIcono={20}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            data-tactil
            disabled={isPending}
            className="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
          >
            {isPending ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Categoría</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Grupo</th>
              <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {categorias.map((c) => (
              <tr key={c.id} className={c.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <ProviderAvatar
                      photo={null}
                      category={c}
                      nombre={c.name}
                      className="h-9 w-9 shrink-0 rounded-lg"
                      tamañoIcono={18}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="truncate text-xs text-[var(--color-text-secondary)]">
                        {c.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 text-[var(--color-text-secondary)] sm:table-cell">
                  {c.groupName}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(c)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => alternar(c)}
                      disabled={isPending}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)]"
                    >
                      {c.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
