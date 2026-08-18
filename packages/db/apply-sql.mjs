// Aplica un archivo SQL arbitrario a la DB. Útil para los SQL "de bootstrapping"
// que viven en `supabase/` (functions, policies, storage, seed) y que no pasan
// por drizzle-kit.
//
// Uso (desde el root del repo, vía `pnpm db:sql <path>`):
//   pnpm db:sql supabase/functions.sql
//   pnpm db:sql supabase/policies.sql
//   pnpm db:sql supabase/storage.sql
//   pnpm db:sql supabase/seed.sql
//
// Paths relativos se resuelven desde el root del monorepo (no desde el cwd,
// que pnpm cambia a packages/db/).
//
// Los archivos pueden contener funciones plpgsql con bloques `$$ ... $$` —
// postgres.js con `prepare: false` los envía en modo simple-query y los acepta.

import { readFileSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../apps/web/.env.local') });
loadEnv({ path: resolve(here, '../../apps/web/.env') });

const arg = process.argv[2];
if (!arg) {
  console.error('Uso: node apply-sql.mjs <ruta-al-sql>');
  process.exit(1);
}
// Path relativo se resuelve desde el root del monorepo, no desde process.cwd()
// (pnpm cambia el cwd a packages/db/ pero el user piensa desde el root).
const repoRoot = resolve(here, '../..');
const path = isAbsolute(arg) ? arg : resolve(repoRoot, arg);
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL no definido.');

const content = readFileSync(path, 'utf8');
console.log(`▶ Aplicando ${path}`);

const sql = postgres(url, { prepare: false, max: 1 });
try {
  // Mandar el archivo entero. postgres.js con prepare:false usa simple-query
  // que admite múltiples statements + bloques $$ plpgsql.
  await sql.unsafe(content);
  console.log('✓ OK');
} catch (error) {
  console.error('✗ Falló:', error.message);
  if (error.position) console.error(`  position: ${error.position}`);
  if (error.where) console.error(`  where: ${error.where}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
