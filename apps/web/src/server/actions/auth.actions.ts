'use server';

import { redirect } from 'next/navigation';
import { authService, type OAuthProvider } from '@/server/services/auth.service';
import { listUserTenants } from '@/lib/auth/current-tenant';
import { fail, ok, type ActionResult } from './result';

/**
 * Decide a dónde mandar al user post-login según cuántos tenants tiene.
 * - 0 tenants → /select-tenant?create=true (UI para crear el primero)
 * - 1 tenant  → /[tenantSlug] directo
 * - 2+        → /select-tenant (picker)
 */
async function postLoginRedirectTarget(): Promise<string> {
  const tenants = await listUserTenants();
  if (tenants.length === 0) return '/select-tenant?create=true';
  if (tenants.length === 1 && tenants[0]) return `/${tenants[0].tenant.slug}`;
  return '/select-tenant';
}

export async function signInWithPasswordAction(
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    await authService.signInWithPassword({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });
    const redirectTo = await postLoginRedirectTarget();
    return ok({ redirectTo });
  } catch (error) {
    return fail(error);
  }
}

export async function signUpWithPasswordAction(
  formData: FormData,
): Promise<ActionResult<{ requiresVerification: boolean }>> {
  try {
    const data = await authService.signUpWithPassword({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      fullName: (formData.get('fullName') as string) || undefined,
    });
    // Si Supabase está configurado con confirmación por email, `session` viene null.
    const requiresVerification = !data.session;
    return ok({ requiresVerification });
  } catch (error) {
    return fail(error);
  }
}

export async function signInWithOAuthAction(provider: OAuthProvider): Promise<void> {
  const result = await authService.signInWithOAuth(provider);
  if (result.url) {
    redirect(result.url);
  }
}

export async function requestMagicLinkAction(
  formData: FormData,
): Promise<ActionResult<{ sent: boolean }>> {
  try {
    await authService.requestMagicLink({ email: String(formData.get('email') ?? '') });
    return ok({ sent: true });
  } catch (error) {
    return fail(error);
  }
}

export async function signOutAction(): Promise<void> {
  await authService.signOut();
  redirect('/login');
}
