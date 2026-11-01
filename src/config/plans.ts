/**
 * Server-side plan catalogue — the single source of truth for what a plan
 * costs and how many credits it grants.
 *
 * Price and credits must never come from the request body: a client that can
 * name its own amount can buy 20 credits for one cent.
 */
export interface Plan {
  id: string;
  name: string;
  /** Credits granted once payment is confirmed. */
  credits: number;
  /** Price in US cents. Also the amount recorded on the order. */
  priceCents: number;
  /** One line on who the plan is for. */
  tagline: string;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  'creator-pro': {
    id: 'creator-pro',
    name: 'Creator Pro',
    credits: 8,
    priceCents: 299,
    tagline: 'For a steady upload schedule.',
    features: [
      'Put your own face in, with your likeness kept',
      'Headlines spelled exactly as you type them',
      'Edit by chatting; every version is kept',
      'Export for YouTube, Shorts, HD and blog cards',
    ],
  },
  'business-elite': {
    id: 'business-elite',
    name: 'Business Elite',
    credits: 20,
    priceCents: 499,
    tagline: 'For teams and channels shipping daily.',
    features: [
      'Everything in Creator Pro',
      'Lowest price per credit',
      'Blog covers designed from any article URL',
      'One balance for every channel you run',
    ],
  },
};

/**
 * Not part of PLANS: everything in that record is purchasable, and a plan
 * priced at zero must never reach checkout.
 */
export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  credits: 3,
  priceCents: 0,
  tagline: 'Enough to judge the output yourself.',
  features: [
    'No card required',
    'Thumbnails from a prompt, your photos or a blog URL',
    'YouTube (16:9) and Shorts (9:16) sizes',
    'Full-resolution downloads',
  ],
};

/** Prices are set in US dollars; Dodo localises them at checkout. */
export const PLAN_CURRENCY = 'USD';

/**
 * Set as metadata on every checkout ThumbAI creates, so the webhook can skip
 * payments made on the same Dodo business by anything else.
 */
export const PAYMENT_APP_TAG = { app: 'thumbai' } as const;

export const getPlan = (planId: unknown): Plan | null => {
  if (typeof planId !== 'string') return null;
  return PLANS[planId] ?? null;
};

/**
 * Formats minor units of a currency: 299 USD → "$2.99", 0 → "$0".
 * Whole amounts drop their decimals so "$0" and "$5" read cleanly.
 */
export const formatMoney = (
  minor: number,
  currency: string = PLAN_CURRENCY,
): string => {
  const major = minor / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
};

/**
 * What a credit actually buys. Costs come from the model registry, and are
 * repeated here as display copy so the pricing page can explain that "8
 * credits" is not the same as "8 thumbnails" once tiers exist.
 */
export const CREDIT_COSTS = [
  { label: 'Draft thumbnail', credits: 1 },
  { label: 'Quality thumbnail', credits: 3 },
  { label: 'Thumbnail from your photo', credits: 3 },
  { label: 'Edit an existing image', credits: 2 },
] as const;
