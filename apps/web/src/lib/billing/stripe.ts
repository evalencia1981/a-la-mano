import 'server-only';

/**
 * Stub de Stripe. La app funciona end-to-end sin Stripe real configurado —
 * cuando se llama `createCheckoutSession`, devolvemos una URL local que
 * dispara `/api/billing/mock-checkout` y simula una activación de suscripción.
 *
 * Cuando vayas a producción:
 *  1. `pnpm add stripe` (no agregado por defecto).
 *  2. Reemplazar los TODOs por integración real.
 *  3. Setear `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` en env.
 *  4. Mover el handler de webhook real a `/api/billing/webhook`.
 */

export async function createCheckoutSession(tenantId: string): Promise<string> {
  console.info('[stripe:stub] createCheckoutSession for tenant', tenantId);
  // TODO: Stripe integration
  //   import Stripe from 'stripe';
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const session = await stripe.checkout.sessions.create({ ... });
  //   return session.url;
  return `/api/billing/mock-checkout?tenant=${tenantId}`;
}

export async function handleWebhook(payload: unknown): Promise<void> {
  console.info('[stripe:stub] handleWebhook', payload);
  // TODO: Stripe integration
}
