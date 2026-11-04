import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CREDIT_COSTS, FREE_PLAN, PLANS, formatMoney } from '@/config/plans';
import { CountUp } from '@/components/motion/CountUp';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { FRAME, H2 } from './type';

export const PricingTeaser = () => {
  const plans = Object.values(PLANS);

  return (
    <section className='pb-20 md:pb-28'>
      <div
        className={`${FRAME} grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20`}
      >
        <Reveal stagger={0.08}>
          <RevealItem as='h2' className={H2}>
            Pay per thumbnail, not per month.
          </RevealItem>
          <RevealItem as='p' className='mt-6 max-w-md text-lg leading-relaxed'>
            Buy a pack of credits once, no subscription. Start with{' '}
            {FREE_PLAN.credits} free and top up when you need more.
          </RevealItem>
          <RevealItem as='ul' className='mt-8 max-w-sm space-y-2'>
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
          </RevealItem>
        </Reveal>

        <Reveal stagger={0.08} delay={0.1} className='flex flex-col gap-4'>
          {[FREE_PLAN, ...plans].map((plan) => (
            <RevealItem
              key={plan.id}
              className='grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 rounded-2xl bg-secondary p-6'
            >
              <h3 className='text-lg font-medium'>{plan.name}</h3>
              <p className='row-span-2 text-right'>
                <span className='block font-serif text-4xl leading-none font-bold tabular-nums'>
                  {plan.priceCents === 0
                    ? 'Free'
                    : formatMoney(plan.priceCents)}
                </span>
                {plan.priceCents > 0 && (
                  <span className='text-sm text-muted-foreground'>
                    USD, one-time
                  </span>
                )}
              </p>
              <p className='text-muted-foreground'>
                <CountUp
                  to={plan.credits}
                  suffix=' credits'
                  className='text-foreground'
                />{' '}
                &middot; {plan.tagline}
              </p>
            </RevealItem>
          ))}
          <RevealItem className='mt-2 self-start'>
            <Link
              href='/pricing'
              className='group inline-flex items-center gap-1.5 font-medium text-brand'
            >
              Compare plans
              <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
            </Link>
          </RevealItem>
        </Reveal>
      </div>
    </section>
  );
};
