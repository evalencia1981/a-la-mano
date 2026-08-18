// Arma un "vecindario" de prueba para poder ver funcionando la recomendación
// de proveedores entre comunidades cercanas.
//
// Crea:
//   1. Ubicación (Medellín / Laureles) para la comunidad que uses.
//   2. Una segunda comunidad vecina, "Balcones de Laureles".
//   3. Cuatro vecinos ficticios que califican — hacen falta para superar el
//      mínimo de 3 opiniones que exige la recomendación.
//   4. Proveedores en esa comunidad vecina, bien calificados.
//
// Resultado: desde tu comunidad, Admin ▸ Recomendados muestra candidatos
// reales, con su reputación y su sector.
//
// Uso (desde apps/web):  node scripts/seed-vecindario.mjs [slug-de-tu-comunidad]
//
// Los usuarios se crean con la API de administración de Supabase, con correos
// @ejemplo.local que no existen. Es data de desarrollo: no correr en producción.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));

/* Parser mínimo de .env.local: `dotenv` es dependencia de packages/db, no de
 * la app, y no vale sumar una dependencia por un script de desarrollo. */
for (const linea of readFileSync(resolve(here, '../.env.local'), 'utf8').split('\n')) {
  const limpia = linea.trim();
  if (!limpia || limpia.startsWith('#')) continue;
  const corte = limpia.indexOf('=');
  if (corte < 1) continue;
  const clave = limpia.slice(0, corte).trim();
  const valor = limpia.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[clave]) process.env[clave] = valor;
}

const MI_SLUG = process.argv[2] ?? 'virus-pub';
const CIUDAD = 'Medellín';
const SECTOR = 'Laureles';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 20 });

/**
 * Crea un usuario con la API de administración de Supabase.
 *
 * Se llama por HTTP en vez de con `@supabase/supabase-js` porque el SDK
 * arrastra el cliente de realtime, que exige WebSocket nativo — y Node 20 no
 * lo tiene. Para crear usuarios alcanza con este POST.
 */
async function crearUsuario({ email, password, nombre }) {
  const respuesta = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: nombre },
      }),
    },
  );
  const cuerpo = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(`No se pudo crear ${email}: ${cuerpo.msg ?? JSON.stringify(cuerpo)}`);
  }
  return cuerpo.id;
}

const VECINOS = [
  { email: 'ana.vecina@ejemplo.local', nombre: 'Ana Restrepo' },
  { email: 'carlos.vecino@ejemplo.local', nombre: 'Carlos Betancur' },
  { email: 'lucia.vecina@ejemplo.local', nombre: 'Lucía Mesa' },
  { email: 'pedro.vecino@ejemplo.local', nombre: 'Pedro Zapata' },
];

/* Proveedores de la comunidad vecina. Los de Laureles comparten sector con
 * tu comunidad, así que deben aparecer primero en la recomendación. */
const PROVEEDORES = [
  {
    categoria: 'electricidad',
    name: 'Electricidad Montoya',
    phone: '+57 300 000 0101',
    neighborhood: 'Laureles',
    description: 'Instalaciones y urgencias eléctricas. Trabaja en toda la zona de Laureles.',
    estrellas: [5, 5, 4, 5],
  },
  {
    categoria: 'limpieza-hogar',
    name: 'Aseo Integral Nubia',
    phone: '+57 300 000 0102',
    neighborhood: 'Laureles',
    description: 'Aseo por día para apartamentos y zonas comunes.',
    estrellas: [5, 4, 5],
  },
  {
    categoria: 'cerrajeria',
    name: 'Cerrajería 24/7 Duque',
    phone: '+57 300 000 0103',
    neighborhood: 'Laureles',
    description: 'Apertura de puertas y cambio de guardas a cualquier hora.',
    estrellas: [4, 5, 4, 4],
  },
  {
    categoria: 'electrodomesticos',
    name: 'Refrigeración Álvarez',
    phone: '+57 300 000 0104',
    neighborhood: 'Envigado',
    description: 'Reparación de neveras y aires acondicionados.',
    estrellas: [5, 4, 5],
  },
  {
    categoria: 'piscinas',
    name: 'Piscinas Cristal',
    phone: '+57 300 000 0105',
    neighborhood: 'Envigado',
    description: 'Mantenimiento semanal de piscinas de unidades residenciales.',
    estrellas: [4, 4, 4],
  },
  {
    /* Con dos opiniones queda por debajo del mínimo: sirve para comprobar
     * que el umbral efectivamente filtra. */
    categoria: 'pintura',
    name: 'Pinturas El Roble',
    phone: '+57 300 000 0106',
    neighborhood: 'Laureles',
    description: 'Pintura de interiores.',
    estrellas: [5, 5],
  },
];

const normalizar = (t) => t.replace(/\D/g, '');

try {
  // 1. Ubicación de tu comunidad.
  const [mia] = await sql`
    update core.tenants set city = ${CIUDAD}, sector = ${SECTOR}
    where slug = ${MI_SLUG} returning id, name`;
  if (!mia) throw new Error(`No existe la comunidad "${MI_SLUG}".`);
  console.log(`▶ ${mia.name} ubicada en ${SECTOR}, ${CIUDAD}`);

  // 2. Comunidad vecina.
  let [vecina] = await sql`select id, name from core.tenants where slug = 'balcones-laureles'`;
  if (!vecina) {
    [vecina] = await sql`
      insert into core.tenants (slug, name, type, city, sector, primary_color, secondary_color)
      values ('balcones-laureles', 'Balcones de Laureles', 'residential', ${CIUDAD}, ${SECTOR},
              '#0E5C43', '#0A4432')
      returning id, name`;
  }
  console.log(`▶ Comunidad vecina: ${vecina.name}`);

  // 3. Vecinos que califican.
  const perfiles = [];
  for (const v of VECINOS) {
    let [perfil] = await sql`select id from core.profiles where email = ${v.email}`;
    if (!perfil) {
      const id = await crearUsuario({
        email: v.email,
        password: `demo-${v.email.length * 7919}-alamano`,
        nombre: v.nombre,
      });
      perfil = { id };
      /* El trigger handle_new_user crea el perfil, pero el nombre puede
       * llegar vacío según cómo esté escrito: lo aseguramos acá. */
      await sql`update core.profiles set full_name = ${v.nombre} where id = ${perfil.id}`;
    }
    perfiles.push(perfil.id);

    await sql`
      insert into core.tenant_members (tenant_id, user_id, role, status)
      values (${vecina.id}, ${perfil.id}, 'member', 'active')
      on conflict do nothing`;
  }
  console.log(`▶ Vecinos que califican: ${perfiles.length}`);

  // 4. Proveedores de la comunidad vecina, con sus calificaciones.
  const cats = await sql`select id, slug from directory.categories`;
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  let creados = 0;
  let calificaciones = 0;

  for (const p of PROVEEDORES) {
    const categoryId = catId[p.categoria];
    if (!categoryId) continue;
    const phoneNormalized = normalizar(p.phone);

    let [provider] = await sql`
      select id from directory.providers where phone_normalized = ${phoneNormalized}`;
    if (!provider) {
      [provider] = await sql`
        insert into directory.providers
          (name, category_id, city, neighborhood, phone, phone_normalized,
           is_whatsapp, description, created_by)
        values
          (${p.name}, ${categoryId}, ${CIUDAD}, ${p.neighborhood}, ${p.phone},
           ${phoneNormalized}, true, ${p.description}, ${perfiles[0]})
        returning id`;
      creados++;
    }

    let [cp] = await sql`
      select id from directory.community_providers
      where tenant_id = ${vecina.id} and provider_id = ${provider.id}`;
    if (!cp) {
      [cp] = await sql`
        insert into directory.community_providers (tenant_id, provider_id, added_by)
        values (${vecina.id}, ${provider.id}, ${perfiles[0]})
        returning id`;
    }

    for (const [i, estrellas] of p.estrellas.entries()) {
      const userId = perfiles[i];
      if (!userId) break;
      const [existe] = await sql`
        select id from directory.ratings
        where tenant_id = ${vecina.id} and community_provider_id = ${cp.id}
          and user_id = ${userId}`;
      if (existe) continue;
      await sql`
        insert into directory.ratings (tenant_id, community_provider_id, user_id, stars)
        values (${vecina.id}, ${cp.id}, ${userId}, ${estrellas})`;
      calificaciones++;
    }
  }

  console.log(`▶ Proveedores creados: ${creados} · calificaciones: ${calificaciones}\n`);

  // 5. Qué va a ver tu comunidad.
  const recomendables = await sql`
    select p.name, p.neighborhood, c.name as categoria,
           p.global_rating_average as promedio, p.global_rating_count as opiniones,
           p.community_count as comunidades
    from directory.providers p
    join directory.categories c on c.id = p.category_id
    where p.city_normalized = core.normalizar_texto(${CIUDAD})
      and p.global_rating_count >= 3
      and p.global_rating_average >= 4.0
      and not exists (
        select 1 from directory.community_providers cp
        where cp.provider_id = p.id and cp.tenant_id = ${mia.id}
      )
    order by (p.neighborhood_normalized = core.normalizar_texto(${SECTOR})) desc,
             p.global_rating_average desc`;

  console.log(`=== ${mia.name} va a ver ${recomendables.length} recomendados ===`);
  for (const r of recomendables) {
    const mismo = r.neighborhood === SECTOR ? ' ← tu sector' : '';
    console.log(
      `  ${r.promedio} ★  ${String(r.opiniones).padStart(2)} op.  ${r.comunidades} com.  ` +
        `${r.name} (${r.categoria}, ${r.neighborhood})${mismo}`,
    );
  }

  const filtrados = await sql`
    select p.name, p.global_rating_count as opiniones, p.global_rating_average as promedio
    from directory.providers p
    where p.global_rating_count > 0 and p.global_rating_count < 3`;
  if (filtrados.length) {
    console.log('\n  Filtrados por no llegar a 3 opiniones:');
    for (const f of filtrados)
      console.log(`    ${f.promedio} ★ con ${f.opiniones} — ${f.name}`);
  }
} finally {
  await sql.end();
}
