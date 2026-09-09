'use client';

import { Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { type Plan, savingsPercent } from '@/config/plans';

interface PricingCardProps {
  plan: Plan;
  /** The one plan we steer people toward. Styled, not stickered. */
  recommended?: boolean;
  ctaText: string;
  onClick?: () => void | Promise<void>;
  loading?: boolean;
  /** Rendered instead of a button for the free plan. */
  ctaHref?: string;
}

/**
 * A plan card.
 *
 * The credit count leads rather than the price, because that is the thing
 * being bought and the thing the plans actually differ on — previously it was
 * buried inside a feature list while three cards showed near-identical prose.
 *
 * Deliberately restrained: no scale-on-hover, no rotated discount sticker, and
 * one signal for "recommended" rather than a ring plus a pill plus a badge.
 */
export const PricingCard = ({
  plan,
  recommended = false,
  ctaText,
  onClick,
  loading = false,
  ctaHref,
}: PricingCardProps) => {
  const saved = savingsPercent(plan);
  const perCredit =
    plan.priceInRupees > 0
      ? (plan.priceInRupees / plan.credits).toFixed(1).replace(/\.0$/, '')
      : null;

  return (
    <div
      className={cn(
        'relative flex w-full max-w-sm flex-col rounded-xl border p-6',
        recommended
          ? 'border-brand/60 bg-neutral-900/60'
          : 'border-neutral-800 bg-neutral-900/30',
      )}
    >
      {recommended && (
        <span className='absolute -top-px left-6 right-6 h-px bg-brand' />
      )}

      <div className='flex items-baseline justify-between gap-3'>
        <h3 className='text-base font-semibold text-neutral-100'>
          {plan.name}
        </h3>
        {recommended && (
          <span className='text-xs font-medium text-brand'>Recommended</span>
        )}
      </div>

      <p className='mt-1 text-sm text-neutral-400'>{plan.tagline}</p>

      {/* The hero number is the credit count, not the price. */}
      <div className='mt-6 flex items-baseline gap-2'>
        <span className='text-4xl font-semibold tracking-tight text-neutral-50'>
          {plan.credits}
        </span>
        <span className='text-sm text-neutral-400'>credits</span>
      </div>

      <div className='mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm'>
        {plan.priceInRupees === 0 ? (
          <span className='text-neutral-300'>Free, on signup</span>
        ) : (
          <>
            <span className='text-neutral-100'>₹{plan.priceInRupees}</span>
            {plan.originalPriceInRupees && (
              <span className='text-neutral-500 line-through'>
                ₹{plan.originalPriceInRupees}
              </span>
            )}
            {saved > 0 && (
              <span className='text-emerald-400'>{saved}% off</span>
            )}
            {perCredit && (
              <span className='text-neutral-500'>· ₹{perCredit} a credit</span>
            )}
          </>
        )}
      </div>

      <ul className='mt-6 mb-8 flex-1 space-y-3'>
        {plan.features.map((feature) => (
          <li key={feature} className='flex gap-2.5 text-sm'>
            {/* Outlined rather than a filled disc: four solid blue dots per
                card competed with the button for attention. */}
            <Check
              aria-hidden
              className='mt-0.5 h-4 w-4 shrink-0 text-brand'
              strokeWidth={2.5}
            />
            <span className='text-neutral-300'>{feature}</span>
          </li>
        ))}
      </ul>

      {ctaHref ? (
        <Button
          asChild
          variant='outline'
          className='w-full border-neutral-700 text-neutral-200 hover:bg-neutral-800'
        >
          <a href={ctaHref}>{ctaText}</a>
        </Button>
      ) : (
        <Button
          onClick={onClick}
          disabled={loading}
          className={cn(
            'w-full cursor-pointer',
            recommended
              ? 'bg-brand text-brand-foreground hover:bg-brand/90'
              : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
          )}
        >
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Starting checkout
            </>
          ) : (
            ctaText
          )}
        </Button>
      )}
    </div>
  );
};
