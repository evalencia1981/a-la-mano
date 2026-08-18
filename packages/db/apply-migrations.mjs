// Aplica todas las migrations SQL en `./drizzle/*.sql` a la DB apuntada
// por DATABASE_URL (resuelta desde apps/web/.env.local).
//
// Uso: node apply-migrations.mjs
//
// Existe porque `drizzle-kit push` en interactivo no es scripteable.
// Alternativa para CI/scripting que evita el prompt.

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../apps/web/.env.local') });
loadEnv({ path: resolve(here, '../../apps/web/.env') });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL no definido.');

const drizzleDir = join(here, 'drizzle');
const files = readdirSync(drizzleDir).filter((f) => f.endsWith('.sql')).sort();

const sql = postgres(url, { prepare: false, max: 1 });

try {
  for (const file of files) {
    const path = join(drizzleDir, file);
    const content = readFileSync(path, 'utf8');
    // Drizzle separa statements con `--> statement-breakpoint`
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    console.log(`▶ ${file} — ${statements.length} statements`);
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (error) {
        console.error(`✗ Falló:\n${stmt.slice(0, 200)}...\n→ ${error.message}`);
        throw error;
      }
    }
    console.log(`✓ ${file}`);
  }
  console.log('Done.');
} finally {
  await sql.end();
}
