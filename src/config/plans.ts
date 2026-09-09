/**
 * Server-side plan catalogue — the single source of truth for what a plan
 * costs and how many credits it grants.
 *
 * Price and credits must never come from the request body: a client that can
 * name its own amount can buy 20 credits for one rupee.
 */
export interface Plan {
  id: string;
  name: string;
  /** Credits granted once payment is confirmed by the webhook. */
  credits: number;
  /** Price in rupees, for display. */
  priceInRupees: number;
}

export const PLANS: Record<string, Plan> = {
  'creator-pro': {
    id: 'creator-pro',
    name: 'Creator Pro',
    credits: 8,
    priceInRupees: 80,
  },
  'business-elite': {
    id: 'business-elite',
    name: 'Business Elite',
    credits: 20,
    priceInRupees: 150,
  },
};

/** Razorpay bills in paise. */
export const toPaise = (rupees: number): number => rupees * 100;

export const getPlan = (planId: unknown): Plan | null => {
  if (typeof planId !== 'string') return null;
  return PLANS[planId] ?? null;
};
