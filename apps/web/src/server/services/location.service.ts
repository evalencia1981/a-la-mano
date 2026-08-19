import 'server-only';
import { z } from 'zod';
import { locationRepository, type LugarSinMapear } from '@/server/repositories/location.repository';
import { auditService } from './audit.service';
import { assertRole, assertTenantMember } from '@/lib/auth/guards';
import {
  buscarLugar,
  esTipoLugar,
  normalizarLugar,
  type LugarOpcion,
  type TipoLugar,
} from '@/lib/location-types';
import type { Location } from '@a-la-mano/db';

/** Techo defensivo. Ninguna unidad real tiene 500 lugares. */
const MAX_LUGARES = 500;

/** Una torre con sus pisos. Es la forma en que se dibuja el mapa. */
export interface NodoMapa {
  lugar: Location;
  hijos: Location[];
}

export interface MapaComunidad {
  torres: NodoMapa[];
  zonas: Location[];
  /** Aplanado y listo para el selector y el matching por texto. */
  opciones: LugarOpcion[];
}

const crearLugarSchema = z.object({
  kind: z.string().refine(esTipoLugar, 'Tipo de lugar inválido.'),
  name: z.string().trim().min(1, 'Poné un nombre.').max(80),
  parentId: z.string().uuid().optional().nullable(),
});

export type CrearLugarInput = z.input<typeof crearLugarSchema>;

/**
 * Orden natural a partir del nombre: "Piso 10" tiene que ir después de
 * "Piso 9", y ordenar alfabéticamente lo pondría entre el 1 y el 2.
 * Lo que no tiene número (una zona) queda en 0 y se ordena por nombre.
 */
function ordenDe(name: string): number {
  const m = name.match(/\d+/);
  if (!m) return 0;
  const n = Number.parseInt(m[0], 10);
  return Number.isSafeInteger(n) ? n : 0;
}

function rutaDe(lugar: Location, padre: Location | null): string {
  return padre ? `${padre.name} · ${lugar.name}` : lugar.name;
}

/** Arma el árbol y el aplanado a partir de la lista cruda. */
function armarMapa(filas: Location[]): MapaComunidad {
  const porId = new Map(filas.map((l) => [l.id, l]));
  const torres = filas
    .filter((l) => l.kind === 'torre')
    .map((torre) => ({
      lugar: torre,
      hijos: filas.filter((l) => l.parentId === torre.id),
    }));
  const zonas = filas.filter((l) => l.kind === 'zona');

  const opciones: LugarOpcion[] = filas.map((l) => ({
    id: l.id,
    kind: l.kind as TipoLugar,
    name: l.name,
    normalized: l.normalized,
    parentId: l.parentId,
    rutaCompleta: rutaDe(l, l.parentId ? (porId.get(l.parentId) ?? null) : null),
  }));

  return { torres, zonas, opciones };
}

export const locationService = {
  /**
   * El mapa que ve cualquier miembro para elegir dónde pasó algo. Solo lo
   * activo: una zona dada de baja no se ofrece, aunque los reportes viejos
   * la sigan mencionando.
   */
  async mapa(tenantId: string): Promise<MapaComunidad> {
    await assertTenantMember(tenantId);
    return armarMapa(await locationRepository.listActivas(tenantId));
  },

  /** El mapa completo, con lo dado de baja. Para la pantalla de edición. */
  async mapaCompleto(tenantId: string): Promise<MapaComunidad> {
    await assertRole(tenantId, ['owner', 'admin']);
    return armarMapa(await locationRepository.listByTenant(tenantId));
  },

  async contar(tenantId: string): Promise<number> {
    await assertTenantMember(tenantId);
    return locationRepository.countByTenant(tenantId);
  },

  /**
   * Lugares que la gente mencionó al reportar y no están cargados,
   * consolidando las variantes de escritura: "torre 3", "Torre 3" y "torre
   * tres" son un solo pendiente, no tres.
   */
  async listSinMapear(
    tenantId: string,
  ): Promise<Array<LugarSinMapear & { variantes: string[] }>> {
    await assertRole(tenantId, ['owner', 'admin']);
    const crudos = await locationRepository.listSinMapear(tenantId);

    const porClave = new Map<string, LugarSinMapear & { variantes: string[] }>();
    for (const fila of crudos) {
      const clave = normalizarLugar(fila.texto);
      if (!clave) continue;
      const previo = porClave.get(clave);
      if (previo) {
        previo.cantidad += fila.cantidad;
        previo.variantes.push(fila.texto);
        if (fila.ultimo > previo.ultimo) previo.ultimo = fila.ultimo;
      } else {
        porClave.set(clave, { ...fila, variantes: [fila.texto] });
      }
    }

    return [...porClave.values()].sort((a, b) => b.cantidad - a.cantidad);
  },

  /**
   * Resuelve un texto contra el mapa. Devuelve null sin drama si no hay
   * coincidencia — quien llama tiene que guardar igual. Bloquear un reporte
   * porque el mapa está incompleto es exactamente lo que no puede pasar.
   */
  async resolverTexto(tenantId: string, texto: string): Promise<LugarOpcion | null> {
    await assertTenantMember(tenantId);
    const { opciones } = armarMapa(await locationRepository.listActivas(tenantId));
    return buscarLugar(texto, opciones);
  },

  async crear(tenantId: string, input: CrearLugarInput): Promise<Location> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const datos = crearLugarSchema.parse(input);
    const kind = datos.kind as TipoLugar;

    if (kind === 'piso' && !datos.parentId) {
      throw new Error('Un piso tiene que pertenecer a una torre.');
    }
    if (kind !== 'piso' && datos.parentId) {
      throw new Error('Solo los pisos cuelgan de una torre.');
    }

    if ((await locationRepository.countByTenant(tenantId)) >= MAX_LUGARES) {
      throw new Error(`El mapa no puede tener más de ${MAX_LUGARES} lugares.`);
    }

    const parentId = datos.parentId ?? null;
    let padre: Location | null = null;
    if (parentId) {
      padre = await locationRepository.getById(parentId);
      if (!padre || padre.tenantId !== tenantId) throw new Error('Torre no encontrada.');
      if (padre.kind !== 'torre') throw new Error('Los pisos solo cuelgan de una torre.');
    }

    const normalized = normalizarLugar(datos.name);
    if (!normalized) throw new Error('Ese nombre no sirve como lugar.');

    const repetido = await locationRepository.findByNormalized(tenantId, normalized, parentId);
    if (repetido) throw new Error(`"${repetido.name}" ya está en el mapa.`);

    const lugar = await locationRepository.create({
      tenantId,
      parentId,
      kind,
      name: datos.name,
      normalized,
      sortOrder: ordenDe(datos.name),
    });

    /* Los reportes que venían mencionando este lugar en texto libre pasan a
     * apuntarle. Es lo que hace que crearlo desde la lista de pendientes
     * arrastre el historial que motivó crearlo. */
    const pendientes = await locationRepository.listSinMapear(tenantId);
    const textos = pendientes
      .filter((p) => normalizarLugar(p.texto) === normalized)
      .map((p) => p.texto);
    const mapeados = await locationRepository.mapearReportes(
      tenantId,
      textos,
      lugar.id,
      rutaDe(lugar, padre),
    );

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'location.created',
      resourceType: 'location',
      resourceId: lugar.id,
      metadata: { kind, name: datos.name, reportesMapeados: mapeados },
    });

    return lugar;
  },

  /**
   * Una torre con sus pisos de una sola vez. Cargar veinte pisos a mano es
   * justamente la parte que hace que el administrador abandone el
   * onboarding a mitad de camino.
   */
  async crearTorreConPisos(
    tenantId: string,
    nombre: string,
    cantidadPisos: number,
  ): Promise<Location> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);

    const pisos = Math.max(0, Math.min(60, Math.trunc(cantidadPisos)));
    const torre = await this.crear(tenantId, { kind: 'torre', name: nombre.trim() });

    if (pisos > 0) {
      const total = await locationRepository.countByTenant(tenantId);
      if (total + pisos > MAX_LUGARES) {
        throw new Error(`El mapa no puede tener más de ${MAX_LUGARES} lugares.`);
      }
      await locationRepository.createMany(
        Array.from({ length: pisos }, (_, i) => ({
          tenantId,
          parentId: torre.id,
          kind: 'piso' as const,
          name: `Piso ${i + 1}`,
          normalized: normalizarLugar(`Piso ${i + 1}`),
          sortOrder: i + 1,
        })),
      );

      await auditService.log({
        tenantId,
        userId: user.id,
        action: 'location.floors_created',
        resourceType: 'location',
        resourceId: torre.id,
        metadata: { pisos },
      });
    }

    return torre;
  },

  /**
   * Alta en lote de zonas comunes desde la lista de sugeridas. Lo que ya
   * existe se saltea en silencio: quien toca ocho chips no quiere leer un
   * error porque una de las ocho ya estaba.
   */
  async crearZonas(tenantId: string, nombres: string[]): Promise<number> {
    await assertRole(tenantId, ['owner', 'admin']);
    let creadas = 0;
    for (const nombre of nombres) {
      try {
        await this.crear(tenantId, { kind: 'zona', name: nombre });
        creadas += 1;
      } catch {
        /* Ya existía o no pasó validación: seguimos con las demás. */
      }
    }
    return creadas;
  },

  async renombrar(tenantId: string, lugarId: string, nombre: string): Promise<Location> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await locationRepository.getById(lugarId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Lugar no encontrado.');

    const name = nombre.trim();
    if (!name) throw new Error('Poné un nombre.');
    const normalized = normalizarLugar(name);
    if (!normalized) throw new Error('Ese nombre no sirve como lugar.');

    const repetido = await locationRepository.findByNormalized(
      tenantId,
      normalized,
      actual.parentId,
    );
    if (repetido && repetido.id !== lugarId) throw new Error(`"${repetido.name}" ya está en el mapa.`);

    const lugar = await locationRepository.update(lugarId, {
      name,
      normalized,
      sortOrder: ordenDe(name),
    });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'location.renamed',
      resourceType: 'location',
      resourceId: lugarId,
      metadata: { antes: actual.name, ahora: name },
    });

    return lugar;
  },

  /**
   * Da de baja o reactiva. Es lo que hay que usar en vez de borrar cuando
   * el lugar tiene historia: los reportes viejos siguen apuntándole.
   */
  async cambiarEstado(tenantId: string, lugarId: string, activo: boolean): Promise<Location> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await locationRepository.getById(lugarId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Lugar no encontrado.');

    const lugar = await locationRepository.update(lugarId, { isActive: activo });

    await auditService.log({
      tenantId,
      userId: user.id,
      action: activo ? 'location.reactivated' : 'location.deactivated',
      resourceType: 'location',
      resourceId: lugarId,
      metadata: { name: actual.name },
    });

    return lugar;
  },

  /**
   * Borra de verdad. Solo se permite si nadie lo mencionó todavía — un
   * lugar con reportes se da de baja, no se borra, o perdemos la evidencia
   * de dónde venían pasando las cosas.
   */
  async eliminar(tenantId: string, lugarId: string): Promise<void> {
    const { user } = await assertRole(tenantId, ['owner', 'admin']);
    const actual = await locationRepository.getById(lugarId);
    if (!actual || actual.tenantId !== tenantId) throw new Error('Lugar no encontrado.');

    const reportes = await locationRepository.countReportes(lugarId);
    if (reportes > 0) {
      throw new Error(
        `"${actual.name}" tiene ${reportes} ${reportes === 1 ? 'reporte' : 'reportes'}. Dalo de baja en vez de borrarlo para no perder el historial.`,
      );
    }

    await locationRepository.delete(lugarId);

    await auditService.log({
      tenantId,
      userId: user.id,
      action: 'location.deleted',
      resourceType: 'location',
      resourceId: lugarId,
      metadata: { name: actual.name, kind: actual.kind },
    });
  },
};

export { crearLugarSchema };
