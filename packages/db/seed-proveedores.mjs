// Carga un directorio de proveedores de prueba en una comunidad.
//
// Uso (desde el root):  node packages/db/seed-proveedores.mjs [slug]
// Por defecto usa `indigo`.
//
// Respeta la regla del proyecto sobre `phoneNormalized` como clave de
// matching: antes de crear busca por teléfono normalizado y reusa el
// proveedor si ya existe. Es lo mismo que hace `providerService.findOrCreate`,
// que no se puede llamar desde acá porque exige una sesión autenticada.
//
// Data de desarrollo: NO correr contra producción. Los teléfonos son falsos
// a propósito (bloque 300 000 00xx, que no existe como abonado real).

import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: resolve(process.cwd(), 'apps/web/.env.local') });
loadEnv({ path: resolve(process.cwd(), '../../apps/web/.env.local') });

const SLUG = process.argv[2] ?? 'indigo';
const CIUDAD = 'Medellín';
const BARRIO = 'Laureles';

/** Solo dígitos — misma normalización que `lib/contact.ts`. */
const normalizar = (t) => (t ?? '').replace(/\D/g, '');

/* Elegidos por lo que de verdad necesita una copropiedad, no por variedad:
 * las urgencias primero (plomería y electricidad 24h son las que llaman a las
 * dos de la mañana) y después el mantenimiento programable. */
const PROVEEDORES = [
  { name: 'Plomería Álvarez 24 Horas', slug: 'plomeria-24h', phone: '+57 300 000 0001',
    desc: 'Fugas, desagües y redes. Atienden urgencias a cualquier hora.' },
  { name: 'Electricidad Restrepo', slug: 'electricidad-24h', phone: '+57 300 000 0002',
    desc: 'Tableros, acometidas y urgencias eléctricas.' },
  { name: 'Ascensores Andinos', slug: 'ascensores', phone: '+57 300 000 0003',
    desc: 'Mantenimiento preventivo y atención de emergencias con personas atrapadas.' },
  { name: 'Motobombas del Valle', slug: 'motobombas', phone: '+57 300 000 0004',
    desc: 'Equipos de presión, motobombas y sistemas hidroneumáticos.' },
  { name: 'Piscinas Cristal', slug: 'piscinas', phone: '+57 300 000 0005',
    desc: 'Mantenimiento semanal, químicos y reparación de filtros.' },
  { name: 'Jardines del Sur', slug: 'jardineria', phone: '+57 300 000 0006',
    desc: 'Corte de césped, poda de setos y mantenimiento de zonas verdes.' },
  { name: 'Cerrajería El Candado', slug: 'cerrajeria', phone: '+57 300 000 0007',
    desc: 'Cerraduras, control de acceso y apertura de puertas.' },
  { name: 'Pinturas Correa', slug: 'pintura', phone: '+57 300 000 0008',
    desc: 'Fachadas, zonas comunes y señalización de parqueaderos.' },
  { name: 'Fumigaciones Halcón', slug: 'fumigacion', phone: '+57 300 000 0009',
    desc: 'Control de plagas y roedores con certificado sanitario.' },
  { name: 'Lavado de Tanques Aqua', slug: 'tanques-agua', phone: '+57 300 000 0010',
    desc: 'Lavado y desinfección de tanques con acta para la autoridad sanitaria.' },
];

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  const [tenant] = await sql`select id, name from core.tenants where slug = ${SLUG}`;
  if (!tenant) throw new Error(`No existe la comunidad "${SLUG}".`);
  console.log(`Comunidad: ${tenant.name} (/${SLUG})\n`);

  let creados = 0;
  let reusados = 0;
  let asociados = 0;

  for (const p of PROVEEDORES) {
    const [categoria] = await sql`
      select id from directory.categories where slug = ${p.slug} limit 1`;
    if (!categoria) {
      console.log(`  ! ${p.name}: no existe la categoría "${p.slug}", se salta`);
      continue;
    }

    const telefono = normalizar(p.phone);

    /* La clave de matching. Si el proveedor ya está en la base —porque otra
     * comunidad lo cargó— se reusa en vez de duplicarlo. */
    let [proveedor] = await sql`
      select id, name from directory.providers where phone_normalized = ${telefono} limit 1`;

    if (proveedor) {
      reusados += 1;
    } else {
      [proveedor] = await sql`
        insert into directory.providers
          (name, category_id, city, neighborhood, phone, phone_normalized,
           is_whatsapp, description)
        values
          (${p.name}, ${categoria.id}, ${CIUDAD}, ${BARRIO}, ${p.phone}, ${telefono},
           true, ${p.desc})
        returning id, name`;
      creados += 1;
    }

    const asociacion = await sql`
      insert into directory.community_providers (tenant_id, provider_id)
      values (${tenant.id}, ${proveedor.id})
      on conflict (tenant_id, provider_id) do nothing
      returning id`;
    if (asociacion.length > 0) asociados += 1;

    console.log(`  ✓ ${p.name.padEnd(30)} ${p.slug}`);
  }

  console.log(`\n  ${creados} proveedores creados, ${reusados} reusados por teléfono`);
  console.log(`  ${asociados} asociados a ${tenant.name}`);
  console.log('\n  Los teléfonos son FALSOS. Cambiá el de uno por el tuyo desde');
  console.log(`  /${SLUG}/admin/providers si querés probar el despacho por WhatsApp.`);
} finally {
  await sql.end();
}
