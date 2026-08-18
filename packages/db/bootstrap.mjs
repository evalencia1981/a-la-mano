// Levanta una DB de Supabase desde cero, en el orden correcto:
//
//   1. migrations de drizzle (`./drizzle/*.sql`) — schemas + tablas
//   2. supabase/functions.sql                    — funciones + triggers
//   3. supabase/policies.sql                     — RLS
//   4. supabase/storage.sql                      — buckets + policies de storage
//   5. supabase/seed.sql                         — categorías globales + tenant demo
//
// Uso (desde el root del repo):  pnpm db:bootstrap
//
// Es idempotente: las migrations usan `create table if not exists`, el resto
// usa `create or replace` / `drop policy if exists` / `on conflict do nothing`.
// Correrlo dos veces no rompe nada.
//
// Existe porque después de recrear un proyecto de Supabase hay que aplicar
// cinco cosas en un orden que no es obvio, y equivocarse deja la DB a medias.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
loadEnv({ path: resolve(repoRoot, 'apps/web/.env.local') });
loadEnv({ path: resolve(repoRoot, 'apps/web/.env') });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL no definido en apps/web/.env.local');

const sql = postgres(url, { prepare: false, max: 1 });

/** Corre un SQL entero en modo simple-query (soporta bloques $$ de plpgsql). */
async function runFile(label, path) {
  if (!existsSync(path)) {
    console.log(`⊘ ${label} — no existe, salteando`);
    return;
  }
  process.stdout.write(`▶ ${label} ... `);
  await sql.unsafe(readFileSync(path, 'utf8'));
  console.log('✓');
}

try {
  // 1. Migrations de drizzle. Se parten por statement porque drizzle-kit las
  //    genera con `--> statement-breakpoint` y así el error apunta al stmt exacto.
  const drizzleDir = join(here, 'drizzle');
  const migrations = readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrations) {
    const statements = readFileSync(join(drizzleDir, file), 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    process.stdout.write(`▶ migration ${file} (${statements.length} stmts) ... `);
    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (error) {
        console.log('✗');
        console.error(`\n  statement:\n${stmt.slice(0, 300)}\n  → ${error.message}\n`);
        throw error;
      }
    }
    console.log('✓');
  }

  // 2-5. SQL de bootstrapping que no pasa por drizzle-kit.
  await runFile('functions.sql', resolve(repoRoot, 'supabase/functions.sql'));
  await runFile('policies.sql', resolve(repoRoot, 'supabase/policies.sql'));
  await runFile('storage.sql', resolve(repoRoot, 'supabase/storage.sql'));
  await runFile('seed.sql', resolve(repoRoot, 'supabase/seed.sql'));

  // Verificación: si algo de esto da 0, la DB quedó a medias.
  const [{ tablas }] = await sql`
    select count(*)::int as tablas from information_schema.tables
    where table_schema in ('core','directory')`;
  const [{ policies }] = await sql`
    select count(*)::int as policies from pg_policies
    where schemaname in ('core','directory')`;
  const [{ categorias }] = await sql`
    select count(*)::int as categorias from directory.categories`;

  console.log(`\n  tablas: ${tablas}   policies: ${policies}   categorías: ${categorias}`);
  if (tablas === 0 || policies === 0 || categorias === 0) {
    throw new Error('La DB quedó incompleta — revisá los errores de arriba.');
  }
  console.log('\n✓ DB lista.');
} finally {
  await sql.end();
}
