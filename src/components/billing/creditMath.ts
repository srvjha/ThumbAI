import { CREDIT_COSTS, PLANS, type Plan } from '@/config/plans';

/** Paid plans in display order, cheapest first. */
export const PAID_PLANS: Plan[] = Object.values(PLANS).sort(
  (a, b) => a.priceInRupees - b.priceInRupees,
);

const costOf = (label: (typeof CREDIT_COSTS)[number]['label']): number =>
  CREDIT_COSTS.find((c) => c.label === label)?.credits ?? 1;

export const DRAFT_COST = costOf('Draft thumbnail');
export const QUALITY_COST = costOf('Quality thumbnail');
export const EDIT_COST = costOf('Edit an existing image');

/** How many of each kind of image a balance covers. */
export const whatCreditsBuy = (credits: number) => ({
  drafts: Math.floor(credits / DRAFT_COST),
  quality: Math.floor(credits / QUALITY_COST),
  edits: Math.floor(credits / EDIT_COST),
});

/** Rupees per credit, trimmed to one decimal ("7.5", "10"). */
export const perCreditPrice = (plan: Plan): string | null =>
  plan.priceInRupees > 0
    ? (plan.priceInRupees / plan.credits).toFixed(1).replace(/\.0$/, '')
    : null;

/** The paid plan with the lowest price per credit. */
export const BEST_VALUE_PLAN_ID = PAID_PLANS.reduce((best, plan) =>
  plan.priceInRupees / plan.credits < best.priceInRupees / best.credits
    ? plan
    : best,
).id;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
