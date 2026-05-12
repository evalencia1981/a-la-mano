import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware global. Refresca la sesión Supabase para que los Server
 * Components nunca vean tokens vencidos.
 *
 * NO mete redirects de auth acá — las páginas hacen su propio gate
 * (más explícito, más fácil de testear).
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Excluimos archivos estáticos y favicon — todo lo demás pasa por el
    // refresh de sesión.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
