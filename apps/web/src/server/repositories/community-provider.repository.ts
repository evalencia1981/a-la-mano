import 'server-only';
import { and, desc, eq, gte, ilike, notExists, or, sql } from 'drizzle-orm';
import {
  categories,
  communityProviders,
  db,
  providerPhotos,
  providers,
  type Category,
  type CommunityProvider,
  type NewCommunityProvider,
  type Provider,
  type ProviderPhoto,
} from '@a-la-mano/db';

export interface CommunityProviderListFilters {
  query?: string;
  categoryId?: string;
  includeInactive?: boolean;
  limit?: number;
  /**
   * Cuántas opiniones hacen falta para que el promedio cuente. Lo pasa el
   * service desde `MINIMO_CALIFICACIONES`; el default está solo para que
   * una llamada suelta no ordene distinto sin querer.
   */
  minimoCalificaciones?: number;
}

export interface CommunityProviderRow {
  communityProvider: CommunityProvider;
  provider: Provider;
  primaryPhoto: ProviderPhoto | null;
}

/** Proveedor probado en otra comunidad cercana, candidato a recomendarse. */
export interface RecomendadoRow {
  provider: Provider;
  category: Category;
  primaryPhoto: ProviderPhoto | null;
  /** El proveedor trabaja en el mismo sector que la comunidad. */
  mismoSector: boolean;
}

export const communityProviderRepository = {
  async listByTenant(
    tenantId: string,
    filters: CommunityProviderListFilters = {},
  ): Promise<CommunityProviderRow[]> {
    const {
      query,
      categoryId,
      includeInactive = false,
      limit = 100,
      minimoCalificaciones = 3,
    } = filters;
    const conditions = [eq(communityProviders.tenantId, tenantId)];
    if (!includeInactive) conditions.push(eq(communityProviders.isActive, true));
    if (categoryId) conditions.push(eq(providers.categoryId, categoryId));
    if (query && query.trim().length > 0) {
      const pattern = `%${query.trim()}%`;
      conditions.push(or(ilike(providers.name, pattern), ilike(providers.description, pattern))!);
    }

    const rows = await db
      .select({
        communityProvider: communityProviders,
        provider: providers,
        primaryPhoto: providerPhotos,
      })
      .from(communityProviders)
      .innerJoin(providers, eq(providers.id, communityProviders.providerId))
      .leftJoin(
        providerPhotos,
        and(eq(providerPhotos.providerId, providers.id), eq(providerPhotos.isPrimary, true)),
      )
      .where(and(...conditions))
      /*
       * Orden del directorio:
       *
       *  1. Primero los AVALADOS, o sea los que llegaron al mínimo de
       *     opiniones. Es el paso que faltaba y el que más cambia la lista:
       *     sin él, un 5.00 de una sola persona encabeza el directorio por
       *     encima de un 4.60 de veinte. Es el mismo criterio que ya usaba
       *     `compararPorCalificacion` cuando el administrador elige a quién
       *     despacharle un trabajo — la lista del vecino ordenaba de otra
       *     forma que la del administrador, y las dos responden la misma
       *     pregunta: a quién llamo.
       *  2. Mejor promedio arriba. `desc` en Postgres pone los nulos
       *     adelante, así que sin `nulls last` un proveedor recién agregado
       *     encabezaría la lista sin una sola opinión.
       *  3. A igual promedio, primero el que tiene más opiniones: 5.00 con
       *     diez respalda mucho más que 5.00 con una.
       *  4. El nombre solo como último recurso, para que el orden sea
       *     estable entre cargas.
       *
       * El orden importa más de lo que parece en el tablero: ahí se piden
       * solo cuatro, así que esto no decide en qué posición se muestran
       * sino CUÁLES se muestran.
       */
      .orderBy(
        sql`(${communityProviders.ratingCount} >= ${minimoCalificaciones}) desc`,
        sql`${communityProviders.ratingAverage} desc nulls last`,
        desc(communityProviders.ratingCount),
        providers.name,
      )
      .limit(limit);

    return rows.map((r) => ({
      communityProvider: r.communityProvider,
      provider: r.provider,
      primaryPhoto: r.primaryPhoto,
    }));
  },

  async getById(id: string): Promise<CommunityProvider | null> {
    const [row] = await db
      .select()
      .from(communityProviders)
      .where(eq(communityProviders.id, id))
      .limit(1);
    return row ?? null;
  },

  async findByTenantAndProvider(
    tenantId: string,
    providerId: string,
  ): Promise<CommunityProvider | null> {
    const [row] = await db
      .select()
      .from(communityProviders)
      .where(
        and(eq(communityProviders.tenantId, tenantId), eq(communityProviders.providerId, providerId)),
      )
      .limit(1);
    return row ?? null;
  },

  async create(data: NewCommunityProvider): Promise<CommunityProvider> {
    const [row] = await db.insert(communityProviders).values(data).returning();
    if (!row) throw new Error('No se pudo crear el community_provider.');
    return row;
  },

  async update(
    id: string,
    data: Partial<NewCommunityProvider>,
  ): Promise<CommunityProvider> {
    const [row] = await db
      .update(communityProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(communityProviders.id, id))
      .returning();
    if (!row) throw new Error('community_provider no encontrado.');
    return row;
  },

  async setActive(id: string, isActive: boolean): Promise<CommunityProvider> {
    return this.update(id, { isActive });
  },

  async listByProvider(providerId: string): Promise<CommunityProvider[]> {
    return db
      .select()
      .from(communityProviders)
      .where(eq(communityProviders.providerId, providerId));
  },

  async getWithDetails(id: string): Promise<CommunityProviderRow | null> {
    const [row] = await db
      .select({
        communityProvider: communityProviders,
        provider: providers,
        primaryPhoto: providerPhotos,
      })
      .from(communityProviders)
      .innerJoin(providers, eq(providers.id, communityProviders.providerId))
      .leftJoin(
        providerPhotos,
        and(eq(providerPhotos.providerId, providers.id), eq(providerPhotos.isPrimary, true)),
      )
      .where(eq(communityProviders.id, id))
      .limit(1);
    if (!row) return null;
    return {
      communityProvider: row.communityProvider,
      provider: row.provider,
      primaryPhoto: row.primaryPhoto,
    };
  },

  /**
   * Proveedores probados en comunidades cercanas que esta comunidad todavía
   * no tiene.
   *
   * Cercanía: misma ciudad. Los del mismo sector van primero, porque un
   * plomero de Laureles le sirve mucho más a otra unidad de Laureles que a
   * una de Envigado.
   *
   * Reputación: se exige un mínimo de calificaciones además del promedio.
   * Sin ese mínimo, un proveedor con una sola opinión de 5 estrellas
   * aparecería por encima de uno con catorce opiniones y 4.6.
   *
   * Devuelve el proveedor, su categoría y en cuántas comunidades está, que
   * es la evidencia que necesita ver el admin para decidir.
   */
  async listRecomendados(
    tenantId: string,
    opciones: {
      ciudadNormalizada: string;
      sectorNormalizado?: string | null;
      minimoCalificaciones?: number;
      promedioMinimo?: number;
      limit?: number;
    },
  ): Promise<RecomendadoRow[]> {
    const {
      ciudadNormalizada,
      sectorNormalizado = null,
      minimoCalificaciones = 3,
      promedioMinimo = 4.0,
      limit = 20,
    } = opciones;

    const rows = await db
      .select({
        provider: providers,
        category: categories,
        primaryPhoto: providerPhotos,
        mismoSector: sql<boolean>`(${providers.neighborhoodNormalized} is not distinct from ${sectorNormalizado})`,
      })
      .from(providers)
      .innerJoin(categories, eq(categories.id, providers.categoryId))
      .leftJoin(
        providerPhotos,
        and(eq(providerPhotos.providerId, providers.id), eq(providerPhotos.isPrimary, true)),
      )
      .where(
        and(
          eq(providers.cityNormalized, ciudadNormalizada),
          gte(providers.globalRatingCount, minimoCalificaciones),
          gte(providers.globalRatingAverage, String(promedioMinimo)),
          /* Los que ya están en esta comunidad no se recomiendan de nuevo,
           * estén activos o desactivados: si el admin lo dio de baja, no
           * queremos ofrecérselo otra vez la semana siguiente. */
          notExists(
            db
              .select({ uno: sql`1` })
              .from(communityProviders)
              .where(
                and(
                  eq(communityProviders.providerId, providers.id),
                  eq(communityProviders.tenantId, tenantId),
                ),
              ),
          ),
        ),
      )
      .orderBy(
        desc(sql`(${providers.neighborhoodNormalized} is not distinct from ${sectorNormalizado})`),
        desc(providers.globalRatingAverage),
        desc(providers.communityCount),
        desc(providers.globalRatingCount),
      )
      .limit(limit);

    return rows.map((r) => ({
      provider: r.provider,
      category: r.category,
      primaryPhoto: r.primaryPhoto,
      mismoSector: r.mismoSector,
    }));
  },

  /**
   * Cuántos proveedores tiene la comunidad en cada categoría, y cuántos de
   * ellos están avalados.
   *
   * Lo consume la grilla de categorías, que sin esto ofrece las 40 del
   * catálogo por igual y manda al vecino a pantallas vacías. Con el conteo,
   * la categoría que la comunidad realmente tiene se ve primero y la vacía
   * queda al final, apagada pero visible — sigue sirviendo para sugerir un
   * proveedor de ese oficio.
   *
   * Una sola consulta agrupada, no una por categoría.
   */
  async countByCategory(
    tenantId: string,
    minimoCalificaciones: number,
  ): Promise<Map<string, { total: number; avalados: number }>> {
    const rows = await db
      .select({
        categoryId: providers.categoryId,
        total: sql<number>`count(*)::int`,
        avalados: sql<number>`count(*) filter (where ${communityProviders.ratingCount} >= ${minimoCalificaciones})::int`,
      })
      .from(communityProviders)
      .innerJoin(providers, eq(providers.id, communityProviders.providerId))
      .where(and(eq(communityProviders.tenantId, tenantId), eq(communityProviders.isActive, true)))
      .groupBy(providers.categoryId);

    return new Map(rows.map((r) => [r.categoryId, { total: r.total, avalados: r.avalados }]));
  },

  async countByTenant(tenantId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityProviders)
      .where(and(eq(communityProviders.tenantId, tenantId), eq(communityProviders.isActive, true)));
    return row?.count ?? 0;
  },
};
