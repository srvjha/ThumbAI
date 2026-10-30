'use client';

import Link from 'next/link';
import { AppPageHeader } from '@/components/app/AppShell';
import { CreditCostTable } from '@/components/billing/CreditCostTable';
import { CreditEstimator } from '@/components/billing/CreditEstimator';
import { OrderHistory } from '@/components/billing/OrderHistory';
import { PlanGrid } from '@/components/billing/PlanGrid';
import {
  DRAFT_COST,
  QUALITY_COST,
  whatCreditsBuy,
} from '@/components/billing/creditMath';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/user/auth';

const BalanceCard = () => {
  const { data, isLoading } = useAuth();
  const credits = data?.credits ?? 0;
  const buys = whatCreditsBuy(credits);

  const stats = [
    { value: buys.drafts, label: 'draft thumbnails' },
    { value: buys.quality, label: 'quality thumbnails' },
    { value: buys.edits, label: 'edits' },
  ];

  return (
    <section className='flex flex-col rounded-2xl border bg-card p-5 sm:p-7'>
      <h2 className='text-sm text-muted-foreground'>Current balance</h2>
      <div className='mt-2 flex items-baseline gap-3'>
        <span className='font-mono text-6xl font-medium leading-none tracking-tight tabular-nums sm:text-7xl'>
          {isLoading ? '—' : credits}
        </span>
        <span className='text-base text-muted-foreground'>
          {credits === 1 ? 'credit' : 'credits'}
        </span>
      </div>

      {!isLoading && (
        <p className='mt-4 text-sm text-foreground/80'>
          {credits >= DRAFT_COST ? (
            <>
              Enough for about{' '}
              <span className='font-mono tabular-nums'>{buys.drafts}</span>{' '}
              draft or{' '}
              <span className='font-mono tabular-nums'>{buys.quality}</span>{' '}
              quality thumbnails.
            </>
          ) : (
            'You are out of credits. Top up below to keep generating.'
          )}
        </p>
      )}

      {/* Each figure is "or", not "and": they draw on the same balance. */}
      <dl className='mt-6 grid grid-cols-3 divide-x rounded-xl border bg-background'>
        {stats.map((s) => (
          <div key={s.label} className='px-3 py-3 sm:px-4'>
            <dd className='font-mono text-xl tabular-nums'>
              {isLoading ? '—' : s.value}
            </dd>
            <dt className='mt-0.5 text-xs leading-snug text-muted-foreground'>
              {s.label}
            </dt>
          </div>
        ))}
      </dl>

      <div className='mt-6 flex flex-wrap items-center gap-3 sm:mt-auto sm:pt-6'>
        <Button asChild variant='brand' size='lg' className='rounded-lg'>
          <Link href='/studio/text-to-image'>Open the studio</Link>
        </Button>
        {!isLoading && credits > 0 && credits < QUALITY_COST && (
          <span className='text-xs text-muted-foreground'>
            A quality thumbnail needs {QUALITY_COST} credits.
          </span>
        )}
      </div>
    </section>
  );
};

const BillingPage = () => (
  <div>
    <AppPageHeader
      title='Credits & billing'
      description='Your balance, what it buys, and every purchase. Credits are one-time, not a subscription.'
    />

    <div className='grid gap-5 lg:grid-cols-[1.15fr_1fr]'>
      <BalanceCard />
      <section>
        <h2 className='mb-3 text-sm font-medium'>What a credit buys</h2>
        <CreditCostTable />
      </section>
    </div>

    <section className='mt-12'>
      <h2 className='font-serif text-2xl tracking-tight sm:text-3xl'>
        Which pack do I need?
      </h2>
      <p className='mt-1 mb-4 text-sm text-muted-foreground'>
        Estimate from what you actually make. Packs are one-time purchases and
        stack on your balance.
      </p>
      <CreditEstimator />
    </section>

    <section className='mt-12'>
      <div className='mb-4 flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h2 className='font-serif text-2xl tracking-tight sm:text-3xl'>
            Top up
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Pay once with card, UPI or netbanking. Credits land in your
            balance as soon as the payment is confirmed.
          </p>
        </div>
        <Link
          href='/pricing'
          className='text-sm text-brand hover:underline'
        >
          Compare plans
        </Link>
      </div>
      <PlanGrid compact />
    </section>

    <section className='mt-12'>
      <h2 className='mb-4 font-serif text-2xl tracking-tight sm:text-3xl'>
        Order history
      </h2>
      <OrderHistory />
    </section>
  </div>
);

export default BillingPage;
