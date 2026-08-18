import 'server-only';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/env';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const signUpSchema = credentialsSchema.extend({
  fullName: z.string().min(2).max(80).optional(),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
});

export type OAuthProvider = 'google' | 'github';

const SUPPORTED_PROVIDERS: OAuthProvider[] = ['google', 'github'];

/**
 * Una ruta interna arranca con `/` y no con `//`. Lo segundo el navegador lo
 * lee como protocolo relativo (`//evil.com` va a otro dominio), así que
 * verificar solo la primera barra no alcanza.
 */
export function esRutaInterna(destino: string): boolean {
  return destino.startsWith('/') && !destino.startsWith('//');
}

/**
 * Capa fina sobre `supabase.auth`. No mete lógica de negocio: solo
 * normaliza errores y centraliza el redirectTo.
 */
export const authService = {
  async signInWithPassword(input: z.input<typeof credentialsSchema>) {
    const { email, password } = credentialsSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async signUpWithPassword(input: z.input<typeof signUpSchema>) {
    const { email, password, fullName } = signUpSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * `destino` es a dónde volver después de autenticarse — lo usa el enlace
   * de ingreso a una comunidad, que necesita retomar el ingreso una vez que
   * la persona inició sesión.
   *
   * Solo se aceptan rutas internas: una URL absoluta acá sería un redirect
   * abierto, que sirve para armar phishing con nuestro dominio.
   */
  async signInWithOAuth(provider: OAuthProvider, destino?: string) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Provider OAuth no soportado: ${provider}`);
    }
    const supabase = await createClient();
    const callback = new URL(`${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`);
    if (destino && esRutaInterna(destino)) {
      callback.searchParams.set('next', destino);
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async requestMagicLink(input: z.input<typeof magicLinkSchema>) {
    const { email } = magicLinkSchema.parse(input);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
  },
};

export { credentialsSchema, signUpSchema, magicLinkSchema };
