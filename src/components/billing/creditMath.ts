import { CREDIT_COSTS, PLANS, formatMoney, type Plan } from '@/config/plans';

/** Paid plans in display order, cheapest first. */
export const PAID_PLANS: Plan[] = Object.values(PLANS).sort(
  (a, b) => a.priceCents - b.priceCents,
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

const centsPerCredit = (plan: Plan): number => plan.priceCents / plan.credits;

/** Price per credit, to the cent ("$0.37"). Null for the free plan. */
export const perCreditPrice = (plan: Plan): string | null =>
  plan.priceCents > 0 ? formatMoney(Math.round(centsPerCredit(plan))) : null;

/** The paid plan with the lowest price per credit. */
export const BEST_VALUE_PLAN_ID = PAID_PLANS.reduce((best, plan) =>
  centsPerCredit(plan) < centsPerCredit(best) ? plan : best,
).id;

/**
 * How much less a credit costs in this pack than in the priciest pack, as a
 * whole percent. A real comparison between packs, not a struck-out price.
 */
export const perCreditSavingsPercent = (plan: Plan): number => {
  if (plan.priceCents <= 0) return 0;
  const priciest = Math.max(...PAID_PLANS.map(centsPerCredit));
  return Math.floor((1 - centsPerCredit(plan) / priciest) * 100);
};

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
