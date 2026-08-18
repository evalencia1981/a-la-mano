import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listUserTenants } from '@/lib/auth/current-tenant';
import { memberService } from '@/server/services/member.service';
import { esRutaInterna } from '@/server/services/auth.service';

/**
 * OAuth + Magic Link callback. Supabase redirige acá con `?code=...` que
 * intercambiamos por sesión. Después decidimos a dónde mandar al user
 * según invitaciones pendientes + cantidad de tenants.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error_description');
  /* Destino pedido antes de autenticarse (ej. el enlace de ingreso a una
   * comunidad). Solo rutas internas: una URL absoluta sería un redirect
   * abierto. */
  const next = searchParams.get('next');

  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  if (next && esRutaInterna(next)) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const [tenants, invitations] = await Promise.all([
    listUserTenants(),
    memberService.listMyPendingInvitations(),
  ]);

  if (invitations.length > 0) {
    return NextResponse.redirect(`${origin}/select-tenant`);
  }
  if (tenants.length === 0) {
    return NextResponse.redirect(`${origin}/select-tenant?create=true`);
  }
  if (tenants.length === 1 && tenants[0]) {
    return NextResponse.redirect(`${origin}/${tenants[0].tenant.slug}`);
  }
  return NextResponse.redirect(`${origin}/select-tenant`);
}
