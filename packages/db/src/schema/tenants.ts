import { boolean, index, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Schema "core" — todas las tablas del template viven acá para no chocar
 * con `auth`, `storage` u otros schemas de Supabase.
 */
export const core = pgSchema('core');

/**
 * Tabla raíz del multi-tenancy. Cada fila representa una organización
 * que el SaaS atiende. Todo dato de feature lleva FK a `tenants.id`.
 */
export const tenants = core.table(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    logoUrl: text('logo_url'),
    primaryColor: text('primary_color').default('#3B82F6'),
    secondaryColor: text('secondary_color').default('#1E40AF'),
    defaultLanguage: text('default_language').default('es'),
    timezone: text('timezone').default('America/Bogota'),
    /** 'trial' | 'active' | 'past_due' | 'suspended'. */
    status: text('status').default('active'),
    plan: text('plan').default('free'),
    /** A la Mano: 'residential' | 'religious' | 'group'. */
    type: text('type').notNull().default('residential'),

    /**
     * Dónde queda la comunidad. Habilita recomendar proveedores probados en
     * unidades cercanas (ver `communityProviderRepository.listRecomendados`).
     *
     * Las columnas `*_normalized` guardan el texto sin tildes, en minúsculas
     * y sin espacios de más — mismo patrón que `providers.phone_normalized`.
     * Son las que se comparan; las otras son las que se muestran tal como
     * las escribió la persona.
     */
    city: text('city'),
    cityNormalized: text('city_normalized'),
    /** Barrio, zona o comuna. Texto libre: "Laureles", "Envigado". */
    sector: text('sector'),
    sectorNormalized: text('sector_normalized'),

    /**
     * Código para el enlace de ingreso de la comunidad.
     *
     * Es la forma práctica de que entren los residentes: el administrador
     * comparte el enlace en el grupo de WhatsApp del edificio, cada quien
     * inicia sesión con Google y queda adentro. Invitar de a un correo no
     * escala a una unidad de ochenta apartamentos.
     *
     * Sigue siendo un directorio privado: sin el código no se entra, y si
     * el enlace se filtra fuera del edificio el administrador lo rota y el
     * anterior deja de servir.
     */
    joinCode: text('join_code').unique(),
    /** Permite cerrar el ingreso sin perder el código. */
    joinCodeEnabled: boolean('join_code_enabled').default(true).notNull(),
    /** Fin del trial gratis de 30 días (lo setea billing.service.startTrial). */
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('tenants_slug_idx').on(t.slug),
    ubicacionIdx: index('tenants_ubicacion_idx').on(t.cityNormalized, t.sectorNormalized),
  }),
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
