// Rellena los datos que la migración de recomendados agregó vacíos:
//
//   1. Normaliza ciudad y barrio de los proveedores que ya existían.
//   2. Normaliza ciudad y sector de las comunidades que ya existían.
//   3. Recalcula la reputación global de todos los proveedores.
//
// Uso:  node backfill-recomendados.mjs
//
// Se corre una sola vez después de aplicar `0001_recomendados.sql`. De ahí en
// adelante los triggers mantienen todo al día solos. Es idempotente: volver a
// correrlo no cambia nada.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../apps/web/.env.local') });

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 20 });

try {
  // Un update vacío dispara los triggers BEFORE UPDATE de normalización.
  const provs = await sql`
    update directory.providers
    set city_normalized = core.normalizar_texto(city),
        neighborhood_normalized = core.normalizar_texto(neighborhood)
    returning id`;
  console.log(`▶ proveedores normalizados: ${provs.length}`);

  const tens = await sql`
    update core.tenants
    set city_normalized = core.normalizar_texto(city),
        sector_normalized = core.normalizar_texto(sector)
    returning id`;
  console.log(`▶ comunidades normalizadas: ${tens.length}`);

  const ids = await sql`select id from directory.providers`;
  for (const { id } of ids) {
    await sql`select directory.refrescar_reputacion_global(${id}::uuid)`;
  }
  console.log(`▶ reputación global recalculada: ${ids.length} proveedores`);

  const resumen = await sql`
    select p.name, p.city, p.neighborhood,
           p.global_rating_average as promedio,
           p.global_rating_count as opiniones,
           p.community_count as comunidades
    from directory.providers p
    order by p.global_rating_average desc nulls last, p.global_rating_count desc`;

  console.log('\n=== REPUTACIÓN GLOBAL ===');
  for (const r of resumen) {
    console.log(
      `  ${String(r.promedio ?? '—').padStart(4)} ★  ${String(r.opiniones).padStart(2)} op.  ` +
        `${r.comunidades} com.  ${r.name} (${r.neighborhood ?? '—'}, ${r.city})`,
    );
  }

  const RECOMENDABLES = resumen.filter(
    (r) => Number(r.promedio) >= 4.0 && r.opiniones >= 3,
  );
  console.log(
    `\n  Con el umbral elegido (3 opiniones y 4.0+): ${RECOMENDABLES.length} de ${resumen.length} serían recomendables.`,
  );
} finally {
  await sql.end();
}
