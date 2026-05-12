import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { env } from '@/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente Supabase para Server Components y Server Actions. Lee/escribe
 * cookies via `next/headers` para mantener la sesión sincronizada.
 *
 * Respeta RLS — opera con el rol `authenticated` del user logueado.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // El `set` puede tirar desde Server Components puros (sin Action).
          // El middleware se encarga de refrescar — ignorar acá.
        }
      },
    },
  });
}

/**
 * Cliente service-role: bypassea RLS. Usar SOLO para operaciones que
 * requieren saltarse policies (creación inicial de tenant, escritura
 * de audit log, gestión de invitaciones por token).
 *
 * NUNCA exponer al cliente. NUNCA pasarle parámetros que vengan del user
 * sin validar antes en el service.
 */
export function createServiceRoleClient() {
  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
