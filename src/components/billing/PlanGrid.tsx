'use client';

import { useUser } from '@clerk/nextjs';
import { PricingCard } from '@/components/Pricing';
import { FREE_PLAN } from '@/config/plans';
import { cn } from '@/lib/utils';
import { BEST_VALUE_PLAN_ID, PAID_PLANS } from './creditMath';
import { useCreditCheckout } from './useCreditCheckout';

/**
 * The buyable plans, wired to checkout. /pricing shows the free plan beside
 * them; /billing shows only the paid ones, compact, as an inline top-up.
 */
export const PlanGrid = ({
  includeFree = false,
  compact = false,
}: {
  includeFree?: boolean;
  compact?: boolean;
}) => {
  const { isSignedIn } = useUser();
  const { startCheckout, loadingPlanId, checkout } = useCreditCheckout();

  return (
    <>
      <div
        className={cn(
          'grid gap-4 sm:gap-5',
          includeFree ? 'md:grid-cols-3' : 'sm:grid-cols-2',
        )}
      >
        {includeFree && (
          <PricingCard
            plan={FREE_PLAN}
            compact={compact}
            ctaText={isSignedIn ? 'Go to the studio' : 'Start free'}
            ctaHref={isSignedIn ? '/studio/text-to-image' : '/sign-up'}
          />
        )}
        {PAID_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            compact={compact}
            recommended={plan.id === BEST_VALUE_PLAN_ID}
            ctaText={`Buy ${plan.credits} credits`}
            loading={loadingPlanId === plan.id}
            onClick={() => startCheckout(plan)}
          />
        ))}
      </div>
      {checkout}
    </>
  );
};
