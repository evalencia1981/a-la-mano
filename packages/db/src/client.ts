import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Cliente Drizzle de uso general (server-side). Bypassea RLS porque
 * el connection string apunta al pooler con credenciales del role `postgres`
 * o `service_role`. Para queries que deben respetar RLS, usar el cliente
 * Supabase (`lib/supabase/server.ts`).
 *
 * Regla práctica:
 *  - Repositorios que escriben datos del sistema (audit, creación inicial
 *    de tenant) → este cliente.
 *  - Lecturas para mostrar al user que ya filtran por tenant en código →
 *    también acá, validando con `assertTenantMember` antes.
 *  - Lecturas que confían en RLS pura → cliente Supabase.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está definido.');
  }
  return url;
}

const queryClient = postgres(getDatabaseUrl(), {
  prepare: false,
  max: 10,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
