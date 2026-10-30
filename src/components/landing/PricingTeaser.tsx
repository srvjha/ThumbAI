import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CREDIT_COSTS, FREE_PLAN, PLANS } from '@/config/plans';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const PricingTeaser = () => {
  const plans = Object.values(PLANS);

  return (
    <section className='py-24 md:py-40'>
      <div className='mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-20 lg:px-8'>
        <div>
          <h2 className='font-serif text-[clamp(2.25rem,5vw,4rem)] leading-[1] tracking-[-0.02em] text-balance'>
            Pay per thumbnail, not per month.
          </h2>
          <p className='mt-6 max-w-md text-lg leading-relaxed'>
            Buy a pack of credits once, no subscription. Start with{' '}
            {FREE_PLAN.credits} free and top up when you need more.
          </p>
          <ul className='mt-8 max-w-sm space-y-2'>
            {CREDIT_COSTS.map((c) => (
              <li
                key={c.label}
                className='flex items-baseline justify-between gap-4 rounded-lg bg-secondary px-4 py-3'
              >
                <span>{c.label}</span>
                <span className='tabular-nums text-muted-foreground'>
                  {c.credits} {c.credits === 1 ? 'credit' : 'credits'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className='flex flex-col gap-4'>
          {[FREE_PLAN, ...plans].map((plan) => (
            <div
              key={plan.id}
              className='grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 rounded-2xl bg-card p-6'
            >
              <h3 className='text-lg font-medium'>{plan.name}</h3>
              <p className='row-span-2 text-right'>
                <span className='block font-serif text-4xl leading-none tabular-nums'>
                  {plan.priceInRupees === 0 ? 'Free' : rupees(plan.priceInRupees)}
                </span>
                {plan.originalPriceInRupees && (
                  <span className='text-sm text-muted-foreground line-through'>
                    {rupees(plan.originalPriceInRupees)}
                  </span>
                )}
              </p>
              <p className='text-muted-foreground'>
                <span className='tabular-nums text-foreground'>
                  {plan.credits} credits
                </span>{' '}
                &middot; {plan.tagline}
              </p>
            </div>
          ))}
          <Link
            href='/pricing'
            className='group mt-2 inline-flex items-center gap-1.5 self-start font-medium text-brand'
          >
            Compare plans
            <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
          </Link>
        </div>
      </div>
    </section>
  );
};
