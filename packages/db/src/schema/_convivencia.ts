import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * Schema `convivencia` — lo que pasa dentro de la comunidad y dónde pasa.
 *
 * Separado de `directory` porque no tiene nada que ver con proveedores, y
 * de `core` porque no es del template: es la primera pieza propia de A la
 * Mano que no es el directorio.
 *
 * Vive en su propio archivo (y no dentro de `incident_reports.ts`) porque
 * `locations` e `incident_reports` se referencian entre sí: si el schema se
 * declarara en una de las dos, el import sería circular.
 */
export const convivencia = pgSchema('convivencia');
