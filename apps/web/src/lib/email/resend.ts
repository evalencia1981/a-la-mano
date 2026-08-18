import 'server-only';

/**
 * Stub de Resend. Si `RESEND_API_KEY` no está, hace `console.log` y devuelve
 * un id ficticio — la app funciona end-to-end sin email real configurado.
 *
 * Cuando vayas a producción:
 *  1. `pnpm add resend` (no agregado por defecto para no atar el template).
 *  2. Reemplazar el TODO de abajo por la integración real.
 *  3. Setear `RESEND_API_KEY` en env.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Stub mode — útil para dev y QA sin gastar envíos.
    console.info('[email:stub]', {
      to: opts.to,
      subject: opts.subject,
      preview: opts.html.slice(0, 200),
    });
    return { success: true, id: `stub-${Date.now()}` };
  }

  // TODO: Resend integration
  //   import { Resend } from 'resend';
  //   const resend = new Resend(apiKey);
  //   const { data, error } = await resend.emails.send({
  //     from: opts.from ?? 'A la Mano <no-reply@alamano.app>',
  //     to: opts.to,
  //     subject: opts.subject,
  //     html: opts.html,
  //   });
  //   if (error) return { success: false, error: error.message };
  //   return { success: true, id: data?.id };
  throw new Error('Resend integration no implementada todavía. Ver lib/email/resend.ts');
}
