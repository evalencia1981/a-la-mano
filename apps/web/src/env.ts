import { z } from 'zod';

/**
 * Validación de variables de entorno con Zod. Se ejecuta una sola vez al
 * importar este módulo — si falta algo o está mal formateado, el build
 * o el dev server falla rápido con un error claro.
 *
 * Regla: TODO acceso a `process.env.X` desde código de aplicación debe
 * pasar por `env` exportado acá. Esto nos da type-safety y previene
 * typos como `process.env.SUPBASE_URL`.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
    throw new Error('Variables de entorno inválidas. Revisá tu .env.');
  }
  return parsed.data;
}

export const env = loadEnv();
