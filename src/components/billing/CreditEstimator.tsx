'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { savingsPercent, type Plan } from '@/config/plans';
import { cn } from '@/lib/utils';
import { DRAFT_COST, EDIT_COST, PAID_PLANS, QUALITY_COST } from './creditMath';
import { useCreditCheckout } from './useCreditCheckout';

/**
 * Costs follow the studio: Shorts and blog covers run on whichever tier is
 * picked, and the studio defaults to Draft, so they are estimated at Draft.
 */
const OPTIONS = [
  { id: 'yt-draft', label: 'YouTube thumbnails', detail: 'Draft', cost: DRAFT_COST },
  { id: 'yt-quality', label: 'YouTube thumbnails', detail: 'Quality', cost: QUALITY_COST },
  { id: 'shorts', label: 'Shorts covers', detail: 'Draft, 9:16', cost: DRAFT_COST },
  { id: 'blog', label: 'Blog covers', detail: 'Draft, from a URL', cost: DRAFT_COST },
  { id: 'edit', label: 'Edits of an existing image', detail: 'Image to image', cost: EDIT_COST },
] as const;

type OptionId = (typeof OPTIONS)[number]['id'];

const MAX_PER_WEEK = 50;
// The recommendation aims to last about this long at the chosen pace.
const TARGET_WEEKS = 4;

/** Smallest pack covering the target, else the largest and how many of it. */
const recommend = (monthly: number): { plan: Plan; packs: number } => {
  const fits = PAID_PLANS.find((p) => p.credits >= monthly);
  if (fits) return { plan: fits, packs: 1 };
  const largest = PAID_PLANS[PAID_PLANS.length - 1];
  return { plan: largest, packs: Math.ceil(monthly / largest.credits) };
};

const Stepper = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) => (
  <div className='flex items-center gap-1' role='group' aria-label={label}>
    <button
      type='button'
      aria-label='Fewer'
      onClick={() => onChange(Math.max(1, value - 1))}
      disabled={value <= 1}
      className='grid size-7 place-items-center rounded-md border bg-card hover:bg-secondary disabled:opacity-40'
    >
      <Minus className='size-3.5' />
    </button>
    <span className='w-8 text-center font-mono text-sm tabular-nums'>
      {value}
    </span>
    <button
      type='button'
      aria-label='More'
      onClick={() => onChange(Math.min(MAX_PER_WEEK, value + 1))}
      disabled={value >= MAX_PER_WEEK}
      className='grid size-7 place-items-center rounded-md border bg-card hover:bg-secondary disabled:opacity-40'
    >
      <Plus className='size-3.5' />
    </button>
  </div>
);

/**
 * "Which pack do I need?" answered from the user's own output. Everything is
 * computed from plans.ts; packs are one-time purchases, so the estimate is
 * framed as how long a pack lasts, never as a monthly price.
 */
export const CreditEstimator = ({ compact = false }: { compact?: boolean }) => {
  const [perWeek, setPerWeek] = useState<Partial<Record<OptionId, number>>>({
    'yt-draft': 3,
  });
  const { startCheckout, loadingPlanId, checkout } = useCreditCheckout();

  const weekly = OPTIONS.reduce(
    (sum, o) => sum + (perWeek[o.id] ?? 0) * o.cost,
    0,
  );
  const monthly = weekly * TARGET_WEEKS;
  const { plan, packs } = useMemo(() => recommend(monthly), [monthly]);
  const total = plan.credits * packs;
  const weeksCovered = weekly > 0 ? Math.floor(total / weekly) : 0;
  const fill = total > 0 ? Math.min(100, (monthly / total) * 100) : 0;

  const toggle = (id: OptionId) =>
    setPerWeek((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 2;
      return next;
    });

  return (
    <div className='overflow-hidden rounded-2xl border bg-card md:grid md:grid-cols-[1.1fr_1fr]'>
      {/* Left: what you make, and how often. */}
      <div className={cn('p-5', compact ? 'sm:p-6' : 'sm:p-7')}>
        <h3 className='font-serif text-2xl tracking-tight'>What do you make?</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          Pick everything that applies, then set how many per week.
        </p>

        <ul className='mt-5 space-y-2'>
          {OPTIONS.map((o) => {
            const count = perWeek[o.id];
            const on = count !== undefined;
            return (
              <li
                key={o.id}
                className={cn(
                  'rounded-xl border transition-colors',
                  on ? 'border-brand/50 bg-accent/60' : 'bg-card',
                )}
              >
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2 p-3'>
                  <button
                    type='button'
                    role='checkbox'
                    aria-checked={on}
                    onClick={() => toggle(o.id)}
                    className='flex min-w-0 flex-1 items-center gap-3 text-left'
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md border',
                        on ? 'border-brand bg-brand text-brand-foreground' : 'bg-card',
                      )}
                    >
                      {on && <Check className='size-3.5' strokeWidth={3} />}
                    </span>
                    <span className='min-w-0'>
                      <span className='block text-sm font-medium'>{o.label}</span>
                      <span className='block text-xs text-muted-foreground'>
                        {o.detail} ·{' '}
                        <span className='font-mono tabular-nums'>{o.cost}</span>{' '}
                        {o.cost === 1 ? 'credit' : 'credits'} each
                      </span>
                    </span>
                  </button>
                  {on && (
                    <div className='ml-8 flex items-center gap-2 sm:ml-0'>
                      <span className='text-xs text-muted-foreground'>per week</span>
                      <Stepper
                        value={count}
                        label={`${o.label} (${o.detail}) per week`}
                        onChange={(n) =>
                          setPerWeek((prev) => ({ ...prev, [o.id]: n }))
                        }
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className='mt-4 text-sm text-muted-foreground'>
          Estimated use:{' '}
          <span className='font-mono text-foreground tabular-nums'>{weekly}</span>{' '}
          credits a week
        </p>
      </div>

      {/* Right: the pack that covers it. */}
      <div
        className={cn(
          'flex flex-col border-t bg-background p-5 md:border-t-0 md:border-l',
          compact ? 'sm:p-6' : 'sm:p-7',
        )}
      >
        {weekly === 0 ? (
          <div className='my-auto py-8 text-center text-sm text-muted-foreground'>
            Select what you make to see which pack fits.
          </div>
        ) : (
          <>
            <p className='text-xs text-muted-foreground'>Recommended pack</p>
            <div className='mt-1 flex flex-wrap items-baseline justify-between gap-x-3'>
              <h3 className='font-serif text-3xl tracking-tight'>
                {packs > 1 && (
                  <span className='font-mono text-2xl tabular-nums'>{packs}× </span>
                )}
                {plan.name}
              </h3>
              <div className='flex items-baseline gap-2'>
                <span className='font-mono text-xl tabular-nums'>
                  ₹{plan.priceInRupees}
                </span>
                {plan.originalPriceInRupees && (
                  <span className='font-mono text-sm text-muted-foreground tabular-nums line-through'>
                    ₹{plan.originalPriceInRupees}
                  </span>
                )}
              </div>
            </div>
            <p className='mt-1 text-xs text-muted-foreground'>
              One-time pack
              {savingsPercent(plan) > 0 && (
                <> · <span className='text-brand'>{savingsPercent(plan)}% off</span></>
              )}
              {packs > 1 && <> · price shown is per pack</>}
            </p>

            {/* Track is the credits bought; fill is four weeks of use. */}
            <div className='mt-6'>
              <div
                className='h-2.5 overflow-hidden rounded-full bg-secondary'
                role='img'
                aria-label={`${monthly} of ${total} credits used over ${TARGET_WEEKS} weeks`}
              >
                <div
                  className='h-full rounded-full bg-brand transition-[width] duration-300'
                  style={{ width: `${fill}%` }}
                />
              </div>
              <div className='mt-2 flex justify-between gap-3 text-xs text-muted-foreground'>
                <span>
                  <span className='font-mono text-foreground tabular-nums'>{monthly}</span>{' '}
                  used in {TARGET_WEEKS} weeks
                </span>
                <span>
                  <span className='font-mono text-foreground tabular-nums'>{total}</span>{' '}
                  credits in {packs > 1 ? 'packs' : 'pack'}
                </span>
              </div>
            </div>

            <p className='mt-5 text-sm'>
              ≈{' '}
              <span className='font-mono text-lg tabular-nums'>{weeksCovered}</span>{' '}
              {weeksCovered === 1 ? 'week' : 'weeks'} at this pace
            </p>
            {packs > 1 && (
              <p className='mt-1 text-xs text-muted-foreground'>
                No single pack covers four weeks of this. Buy one now and top up
                as you go; credits stack on your balance.
              </p>
            )}

            {!compact && (
              <ul className='mt-5 space-y-2'>
                {plan.features.slice(0, 3).map((f) => (
                  <li key={f} className='flex gap-2 text-sm text-foreground/80'>
                    <Check
                      aria-hidden
                      className='mt-0.5 size-4 shrink-0 text-brand'
                      strokeWidth={2.5}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className='mt-auto pt-6'>
            <Button
              variant='brand'
              size='lg'
              className='w-full cursor-pointer rounded-lg'
              disabled={loadingPlanId === plan.id}
              onClick={() => startCheckout(plan)}
            >
              {loadingPlanId === plan.id ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  Starting checkout
                </>
              ) : (
                `Get ${plan.name}`
              )}
            </Button>
            </div>
          </>
        )}
      </div>
      {checkout}
    </div>
  );
};
