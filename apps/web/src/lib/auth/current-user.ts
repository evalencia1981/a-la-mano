import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { db, profiles } from '@evalencia-stack/db';
import { eq } from 'drizzle-orm';
import type { CurrentUser } from '@/types';

/**
 * Devuelve el user logueado para uso en RSC y Server Actions. Cacheado
 * por request — llamarlo varias veces en el mismo render no genera
 * varias queries.
 *
 * Retorna `null` si no hay sesión.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);

  return {
    id: user.id,
    email: user.email ?? '',
    profile: profile ?? null,
  };
});
