// Carga datos de demostración en una comunidad: proveedores, asociaciones,
// calificaciones y una sugerencia pendiente. Sirve para poder ver el
// directorio con contenido real durante el desarrollo.
//
// Uso:  pnpm db:seed-demo [slug-de-la-comunidad]     (por defecto: virus-pub)
//
// Es idempotente: los proveedores se identifican por `phone_normalized`
// (la misma clave de matching que usa `providerService.findOrCreate`), así
// que correrlo dos veces no duplica nada.
//
// NO escribe `rating_average` ni `rating_count` — de eso se encarga el
// trigger `directory.update_community_provider_rating`.
//
// Los teléfonos son ficticios (rango 300 000 00xx) a propósito.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../apps/web/.env.local') });

const slug = process.argv[2] ?? 'virus-pub';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 20 });

/** Misma normalización que `lib/contact.ts`: solo dígitos. */
const normalize = (phone) => phone.replace(/\D/g, '');

const PROVEEDORES = [
  {
    categoria: 'plomeria-24h',
    name: 'Jairo Restrepo',
    phone: '+57 300 000 0011',
    neighborhood: 'Laureles',
    description: 'Fugas, destape de cañerías y cambio de tuberías. Atiende urgencias de noche y fines de semana.',
    instagram: null,
    ratings: [{ stars: 5, comment: 'Vino un domingo a las 11 de la noche por una fuga en el baño. Cobró justo.' }, { stars: 5, comment: 'Rápido y ordenado, dejó todo limpio.' }],
  },
  {
    categoria: 'plomeria',
    name: 'Hidráulica del Sur',
    phone: '+57 300 000 0012',
    neighborhood: 'Envigado',
    description: 'Empresa de plomería general. Mantenimiento preventivo para edificios.',
    instagram: null,
    ratings: [{ stars: 4, comment: 'Buen trabajo, aunque se demoraron dos días en venir.' }],
  },
  {
    categoria: 'electricidad',
    name: 'Wilson Agudelo',
    phone: '+57 300 000 0013',
    neighborhood: 'Belén',
    description: 'Instalaciones eléctricas, tableros, cambio de luminarias. Técnico certificado.',
    instagram: null,
    ratings: [{ stars: 5, comment: 'Nos resolvió un corto que otros dos no pudieron encontrar.' }, { stars: 4, comment: 'Muy buen técnico, puntual.' }],
  },
  {
    categoria: 'cerrajeria',
    name: 'Cerrajería Llave Maestra',
    phone: '+57 300 000 0014',
    neighborhood: 'Estadio',
    description: 'Apertura de puertas, cambio de guardas, copias de llaves. 24 horas.',
    instagram: null,
    ratings: [{ stars: 5, comment: 'Me quedé por fuera del apartamento un sábado. Llegó en 20 minutos.' }],
  },
  {
    categoria: 'electrodomesticos',
    name: 'Técnicos JR',
    phone: '+57 300 000 0015',
    neighborhood: 'La América',
    description: 'Reparación de neveras, lavadoras y secadoras. Todas las marcas.',
    instagram: null,
    ratings: [{ stars: 3, comment: 'Arregló la lavadora pero volvió a fallar al mes.' }, { stars: 4, comment: 'Cumplido con la cita.' }],
  },
  {
    categoria: 'limpieza-hogar',
    name: 'Marta Lucía Ospina',
    phone: '+57 300 000 0016',
    neighborhood: 'Laureles',
    description: 'Aseo de apartamentos por día. Trabaja con sus propios implementos.',
    instagram: null,
    ratings: [{ stars: 5, comment: 'Impecable, muy confiable. Lleva años viniendo a la unidad.' }, { stars: 5, comment: 'La recomiendo con los ojos cerrados.' }],
  },
  {
    categoria: 'fumigacion',
    name: 'Control Plagas Antioquia',
    phone: '+57 300 000 0017',
    neighborhood: 'Itagüí',
    description: 'Fumigación de zonas comunes y apartamentos. Productos sin olor, aptos para mascotas.',
    instagram: null,
    ratings: [{ stars: 4, comment: 'Efectivos con las cucarachas. Hay que sacar las mascotas 4 horas.' }],
  },
  {
    categoria: 'jardineria',
    name: 'Verde Vivo',
    phone: '+57 300 000 0018',
    neighborhood: 'Sabaneta',
    description: 'Mantenimiento de jardines y zonas verdes. Contrato mensual para unidades.',
    instagram: 'verdevivo.mde',
    ratings: [{ stars: 5, comment: 'Dejaron el jardín de la unidad como nuevo.' }],
  },
  {
    categoria: 'pintura',
    name: 'Óscar Muñoz',
    phone: '+57 300 000 0019',
    neighborhood: 'Robledo',
    description: 'Pintura de interiores y fachadas. Estuco y resane.',
    instagram: null,
    ratings: [{ stars: 4, comment: 'Buen acabado y precio razonable.' }],
  },
  {
    categoria: 'carpinteria',
    name: 'Maderas y Diseño',
    phone: '+57 300 000 0020',
    neighborhood: 'Guayabal',
    description: 'Muebles a la medida, closets y reparación de puertas.',
    instagram: 'maderasydiseno',
    ratings: [{ stars: 5, comment: 'Hicieron el closet exactamente como lo pedimos.' }, { stars: 4, comment: 'Buen trabajo, se demoraron una semana más de lo prometido.' }],
  },
  {
    categoria: 'mudanzas',
    name: 'Trasteos El Poblado',
    phone: '+57 300 000 0021',
    neighborhood: 'El Poblado',
    description: 'Trasteos con camión y personal. Empaque incluido.',
    instagram: null,
    ratings: [{ stars: 2, comment: 'Rompieron un espejo y no respondieron por el daño.' }],
  },
  {
    categoria: 'gas-calentadores',
    name: 'GasTech Servicio',
    phone: '+57 300 000 0022',
    neighborhood: 'Belén',
    description: 'Instalación y revisión de calentadores a gas. Certificado de conformidad.',
    instagram: null,
    ratings: [{ stars: 5, comment: 'Entregaron el certificado el mismo día.' }],
  },
];

const SUGERENCIA_PENDIENTE = {
  name: 'Peluquería a domicilio Katherine',
  phone: '+57 300 000 0030',
  categoria: 'limpieza-hogar',
  neighborhood: 'Laureles',
  description: 'Corte y peinado a domicilio. Atiende en las tardes.',
  memberNote: 'La usa mi vecina del 302 y quedó feliz. Sería bueno tenerla en el directorio.',
};

try {
  const [tenant] = await sql`select id, name from core.tenants where slug = ${slug}`;
  if (!tenant) throw new Error(`No existe la comunidad "${slug}".`);

  const usuarios = await sql`select id, email from core.profiles order by created_at`;
  if (!usuarios.length) throw new Error('No hay perfiles en la base — hacé login al menos una vez.');

  const cats = await sql`select id, slug from directory.categories`;
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  console.log(`▶ Comunidad: ${tenant.name} (${slug})`);
  console.log(`▶ Usuarios disponibles para calificar: ${usuarios.length}\n`);

  let creados = 0;
  let asociados = 0;
  let calificaciones = 0;

  for (const p of PROVEEDORES) {
    const categoryId = catId[p.categoria];
    if (!categoryId) {
      console.log(`  ⊘ ${p.name}: categoría "${p.categoria}" no existe, salteando`);
      continue;
    }
    const phoneNormalized = normalize(p.phone);

    // Matching por phone_normalized — igual que providerService.findOrCreate.
    let [provider] = await sql`
      select id from directory.providers where phone_normalized = ${phoneNormalized}`;

    if (!provider) {
      [provider] = await sql`
        insert into directory.providers
          (name, category_id, city, neighborhood, phone, phone_normalized,
           is_whatsapp, instagram_handle, description, created_by)
        values
          (${p.name}, ${categoryId}, 'Medellín', ${p.neighborhood}, ${p.phone},
           ${phoneNormalized}, true, ${p.instagram}, ${p.description}, ${usuarios[0].id})
        returning id`;
      creados++;
    }

    let [cp] = await sql`
      select id from directory.community_providers
      where tenant_id = ${tenant.id} and provider_id = ${provider.id}`;

    if (!cp) {
      [cp] = await sql`
        insert into directory.community_providers (tenant_id, provider_id, added_by)
        values (${tenant.id}, ${provider.id}, ${usuarios[0].id})
        returning id`;
      asociados++;
    }

    // Una calificación por usuario disponible, hasta agotar las definidas.
    for (const [i, r] of p.ratings.entries()) {
      const user = usuarios[i];
      if (!user) break;
      const [existente] = await sql`
        select id from directory.ratings
        where tenant_id = ${tenant.id} and community_provider_id = ${cp.id}
          and user_id = ${user.id}`;
      if (existente) continue;
      await sql`
        insert into directory.ratings (tenant_id, community_provider_id, user_id, stars, comment)
        values (${tenant.id}, ${cp.id}, ${user.id}, ${r.stars}, ${r.comment})`;
      calificaciones++;
    }
  }

  // Una sugerencia pendiente para poder ver la cola de moderación del admin.
  const s = SUGERENCIA_PENDIENTE;
  const [yaExiste] = await sql`
    select id from directory.suggestions
    where tenant_id = ${tenant.id} and phone_normalized = ${normalize(s.phone)}`;
  if (!yaExiste && catId[s.categoria]) {
    await sql`
      insert into directory.suggestions
        (tenant_id, suggested_by, name, phone, phone_normalized, category_id, city,
         neighborhood, is_whatsapp, description, member_note, status)
      values
        (${tenant.id}, ${usuarios[usuarios.length - 1].id}, ${s.name}, ${s.phone},
         ${normalize(s.phone)}, ${catId[s.categoria]}, 'Medellín', ${s.neighborhood},
         true, ${s.description}, ${s.memberNote}, 'pending')`;
    console.log('  + 1 sugerencia pendiente de aprobación');
  }

  console.log(`\n  proveedores creados: ${creados}`);
  console.log(`  asociados a la comunidad: ${asociados}`);
  console.log(`  calificaciones: ${calificaciones}`);

  const resumen = await sql`
    select p.name, c.name as categoria, cp.rating_average, cp.rating_count
    from directory.community_providers cp
    join directory.providers p on p.id = cp.provider_id
    join directory.categories c on c.id = p.category_id
    where cp.tenant_id = ${tenant.id}
    order by cp.rating_average desc nulls last`;

  console.log('\n=== DIRECTORIO RESULTANTE (promedios calculados por el trigger) ===');
  for (const r of resumen)
    console.log(`  ${String(r.rating_average ?? '—').padStart(4)} ★ (${r.rating_count})  ${r.name} — ${r.categoria}`);
} finally {
  await sql.end();
}
