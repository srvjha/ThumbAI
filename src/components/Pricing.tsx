'use client';

import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { type Plan, savingsInRupees, savingsPercent } from '@/config/plans';
import { perCreditPrice, whatCreditsBuy } from './billing/creditMath';

interface PricingCardProps {
  plan: Plan;
  /** The one plan we steer people toward. Styled, not stickered. */
  recommended?: boolean;
  /** Label shown in the card when recommended. */
  recommendedLabel?: string;
  ctaText: string;
  onClick?: () => void | Promise<void>;
  loading?: boolean;
  /** Rendered as a link instead of a checkout button (the free plan). */
  ctaHref?: string;
  /** Hide the feature list, for the compact top-up grid on /billing. */
  compact?: boolean;
}

/**
 * A plan card. The credit count leads rather than the price, because that is
 * the thing being bought and the thing the plans actually differ on.
 */
export const PricingCard = ({
  plan,
  recommended = false,
  recommendedLabel = 'Best value',
  ctaText,
  onClick,
  loading = false,
  ctaHref,
  compact = false,
}: PricingCardProps) => {
  const saved = savingsInRupees(plan);
  const perCredit = perCreditPrice(plan);
  const buys = whatCreditsBuy(plan.credits);

  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-2xl border bg-card p-5 sm:p-6',
        recommended
          ? 'border-brand shadow-[0_0_0_1px_var(--brand),0_12px_32px_-16px_rgb(62_99_221/45%)]'
          : 'shadow-[0_1px_2px_rgb(18_23_43/4%)]',
      )}
    >
      <div className='flex items-baseline justify-between gap-3'>
        <h3 className='font-serif text-2xl tracking-tight'>{plan.name}</h3>
        {recommended && (
          <span className='text-xs font-medium text-brand'>
            {recommendedLabel}
          </span>
        )}
      </div>
      <p className='mt-1 text-sm text-muted-foreground'>{plan.tagline}</p>

      {/* The hero number is the credit count, not the price. */}
      <div className='mt-6 flex items-baseline gap-2'>
        <span className='font-mono text-5xl font-medium tracking-tight tabular-nums'>
          {plan.credits}
        </span>
        <span className='text-sm text-muted-foreground'>credits</span>
      </div>
      <p className='mt-1 text-xs text-muted-foreground'>
        ≈ <span className='font-mono tabular-nums'>{buys.drafts}</span> draft
        or <span className='font-mono tabular-nums'>{buys.quality}</span>{' '}
        quality thumbnails
      </p>

      <div className='mt-5 border-t pt-4'>
        {plan.priceInRupees === 0 ? (
          <div className='flex items-baseline gap-2'>
            <span className='font-mono text-2xl tabular-nums'>₹0</span>
            <span className='text-sm text-muted-foreground'>on signup</span>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
              <span className='font-mono text-2xl tabular-nums'>
                ₹{plan.priceInRupees}
              </span>
              {plan.originalPriceInRupees && (
                <span className='font-mono text-sm text-muted-foreground tabular-nums line-through'>
                  ₹{plan.originalPriceInRupees}
                </span>
              )}
              <span className='text-sm text-muted-foreground'>one-time</span>
            </div>
            <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
              {perCredit && (
                <span className='text-muted-foreground'>
                  <span className='font-mono tabular-nums'>₹{perCredit}</span>{' '}
                  per credit
                </span>
              )}
              {saved > 0 && (
                <span className='font-medium text-brand'>
                  Save <span className='font-mono tabular-nums'>₹{saved}</span>{' '}
                  ({savingsPercent(plan)}%)
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {!compact && (
        <ul className='mt-6 flex-1 space-y-2.5'>
          {plan.features.map((feature) => (
            <li key={feature} className='flex gap-2.5 text-sm'>
              <Check
                aria-hidden
                className='mt-0.5 size-4 shrink-0 text-brand'
                strokeWidth={2.5}
              />
              <span className='text-foreground/80'>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={cn(compact ? 'mt-5' : 'mt-8')}>
        {ctaHref ? (
          <Button asChild variant='outline' size='lg' className='w-full rounded-lg'>
            <Link href={ctaHref}>{ctaText}</Link>
          </Button>
        ) : (
          <Button
            onClick={onClick}
            disabled={loading}
            variant={recommended ? 'brand' : 'outline'}
            size='lg'
            className='w-full cursor-pointer rounded-lg'
          >
            {loading ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                Starting checkout
              </>
            ) : (
              ctaText
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
