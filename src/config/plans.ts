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
  /** Pre-discount price, for display only. Omit when there is no discount. */
  originalPriceInRupees?: number;
  /** One line on who the plan is for. */
  tagline: string;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  'creator-pro': {
    id: 'creator-pro',
    name: 'Creator Pro',
    credits: 8,
    priceInRupees: 80,
    originalPriceInRupees: 200,
    tagline: 'For a steady upload schedule.',
    features: [
      'YouTube (16:9) and Shorts (9:16) sizes',
      'Conversational editing on every image',
      'Full-resolution downloads',
      'Every version kept, nothing overwritten',
    ],
  },
  'business-elite': {
    id: 'business-elite',
    name: 'Business Elite',
    credits: 20,
    priceInRupees: 150,
    originalPriceInRupees: 300,
    tagline: 'For teams and channels shipping daily.',
    features: [
      'Everything in Creator Pro',
      'Best value per credit',
      'Blog cover generation from a URL',
      'Priority queue',
    ],
  },
};

/**
 * Not part of PLANS: everything in that record is purchasable, and a plan
 * priced at zero must never reach createOrder.
 */
export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  credits: 3,
  priceInRupees: 0,
  tagline: 'Enough to judge the output yourself.',
  features: [
    '3 credits on signup',
    'Both YouTube and Shorts sizes',
    'Full-resolution downloads',
    'No card required',
  ],
};

/** Razorpay bills in paise. */
export const toPaise = (rupees: number): number => rupees * 100;

export const getPlan = (planId: unknown): Plan | null => {
  if (typeof planId !== 'string') return null;
  return PLANS[planId] ?? null;
};

/** Whole-rupee saving against the pre-discount price. */
export const savingsInRupees = (plan: Plan): number =>
  plan.originalPriceInRupees
    ? plan.originalPriceInRupees - plan.priceInRupees
    : 0;

export const savingsPercent = (plan: Plan): number =>
  plan.originalPriceInRupees
    ? Math.round(
        (savingsInRupees(plan) / plan.originalPriceInRupees) * 100,
      )
    : 0;

/**
 * What a credit actually buys. Costs come from the model registry, and are
 * repeated here as display copy so the pricing page can explain that "8
 * credits" is not the same as "8 thumbnails" once tiers exist.
 */
export const CREDIT_COSTS = [
  { label: 'Draft thumbnail', credits: 1 },
  { label: 'Quality thumbnail', credits: 3 },
  { label: 'Edit an existing image', credits: 2 },
] as const;
