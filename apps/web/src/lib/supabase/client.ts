import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/env';

/**
 * Cliente Supabase para uso en componentes "use client". Usa cookies del
 * browser y respeta RLS con el rol `authenticated`.
 *
 * NO usar en RSC o Server Actions — para eso está `lib/supabase/server.ts`.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
