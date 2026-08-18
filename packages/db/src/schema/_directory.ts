import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * Schema `directory` — entidades del directorio de proveedores.
 *
 * Convención: las tablas de `directory` se separan de `core` porque su
 * ciclo de vida y políticas RLS son diferentes — `providers` y `categories`
 * son entidades GLOBALES (sin `tenant_id`), mientras que `core` siempre
 * lleva tenant.
 */
export const directory = pgSchema('directory');
