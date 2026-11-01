import 'server-only';
import DodoPayments from 'dodopayments';
import { env } from './env';
import { ApiError } from '@/server/errors';

let client: DodoPayments | null = null;

/**
 * The Dodo Payments client. Built on first use, so a deploy without the keys
 * still boots; only checkout and refunds fail, and they say why.
 */
export const dodo = (): DodoPayments => {
  if (!env.DODO_PAYMENTS_API_KEY) {
    throw new ApiError('Payments are not configured', 503);
  }
  client ??= new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });
  return client;
};

/**
 * Dodo product ids per plan. Products live in the Dodo dashboard (test and
 * live mode each have their own ids); `tools/dodo-create-products.mjs`
 * creates them from src/config/plans.ts and prints the values to set.
 */
const PRODUCT_IDS: Record<string, string | undefined> = {
  'creator-pro': env.DODO_PRODUCT_CREATOR_PRO,
  'business-elite': env.DODO_PRODUCT_BUSINESS_ELITE,
};

export const dodoProductId = (planId: string): string => {
  const id = PRODUCT_IDS[planId];
  if (!id) throw new ApiError('Payments are not configured', 503);
  return id;
};
