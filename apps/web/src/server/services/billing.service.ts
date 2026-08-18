import 'server-only';
import { eq } from 'drizzle-orm';
import { db, tenants } from '@a-la-mano/db';
import { auditService } from './audit.service';
import { createCheckoutSession as stripeCreateCheckoutSession } from '@/lib/billing/stripe';

const TRIAL_DURATION_DAYS = 30;

/**
 * Stub de billing. End-to-end con datos mock. TODO: Stripe integration real.
 *
 * Estados de tenant que maneja:
 *   trial    → se setea al crear el tenant (trialEndsAt = now + 30d)
 *   active   → suscripción Stripe vigente
 *   past_due → fallo de cobro, modo read-only en UI
 *   suspended→ cancelado, fuera de servicio
 */
export const billingService = {
  async startTrial(tenantId: string): Promise<void> {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);
    await db
      .update(tenants)
      .set({ status: 'trial', trialEndsAt, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    await auditService.log({
      tenantId,
      action: 'billing.trial_started',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { trialEndsAt: trialEndsAt.toISOString() },
    });
  },

  async createCheckoutSession(tenantId: string): Promise<{ url: string }> {
    const url = await stripeCreateCheckoutSession(tenantId);
    return { url };
  },

  // TODO: Stripe integration — webhook handlers
  async handleSubscriptionCreated(stripeSubscriptionId: string, tenantId: string) {
    await db
      .update(tenants)
      .set({
        status: 'active',
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
    await auditService.log({
      tenantId,
      action: 'billing.subscription_created',
      metadata: { stripeSubscriptionId },
    });
  },

  async handleSubscriptionUpdated(tenantId: string, newStatus: string) {
    await db
      .update(tenants)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    await auditService.log({
      tenantId,
      action: 'billing.subscription_updated',
      metadata: { newStatus },
    });
  },

  async handleSubscriptionCanceled(tenantId: string) {
    await db
      .update(tenants)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    await auditService.log({
      tenantId,
      action: 'billing.subscription_canceled',
    });
  },

  /**
   * Días restantes del trial (negativo si ya venció). null si no está en trial.
   */
  trialDaysRemaining(trialEndsAt: Date | null, status: string | null): number | null {
    if (status !== 'trial' || !trialEndsAt) return null;
    const diffMs = trialEndsAt.getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  },
};

export const BILLING_CONSTS = { TRIAL_DURATION_DAYS } as const;
