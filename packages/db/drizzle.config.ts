import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

/**
 * `drizzle-kit` corre desde este directorio (`packages/db/`), no desde el
 * root. Sin override, `dotenv/config` no encuentra el `.env.local` que vive
 * en `apps/web/`. Resolvemos ambos paths explícitamente.
 *
 * Orden de carga (primer match gana): `.env.local` → `.env`.
 */
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../apps/web/.env.local') });
loadEnv({ path: resolve(here, '../../apps/web/.env') });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no está definido. Completá apps/web/.env.local con la connection string del pooler de Supabase.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schemaFilter: ['core', 'directory'],
  // Tablas en `core` (heredadas del template) y `directory` (A la Mano).
  verbose: true,
  strict: true,
});
