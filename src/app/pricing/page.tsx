import type { Metadata } from 'next';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { CreditCostTable } from '@/components/billing/CreditCostTable';
import { CreditEstimator } from '@/components/billing/CreditEstimator';
import { PlanGrid } from '@/components/billing/PlanGrid';
import { Button } from '@/components/ui/button';
import { FREE_PLAN, type Plan } from '@/config/plans';

/** Kept as the public name for consumers like RenderRazorpay. */
export type PricingDetails = Plan;

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'One-time credit packs for YouTube thumbnails, Shorts covers and blog covers. No subscription.',
};

// Only claims the code backs up: no renewal or expiry logic exists, refunds
// on failure come from refundCredits in the generate and edit routes.
const FAQ = [
  {
    q: 'Is this a subscription?',
    a: 'No. Every pack is a single payment. Nothing renews and nothing is charged again unless you buy another pack.',
  },
  {
    q: 'Do credits expire?',
    a: 'No. Credits stay on your balance until you spend them, and new packs add to whatever you already have.',
  },
  {
    q: 'What if a generation fails?',
    a: 'The credits it took are returned to your balance automatically. You do not need to contact anyone.',
  },
  {
    q: 'Draft or Quality?',
    a: 'Draft is fast, renders text cleanly and costs 1 credit, which suits most thumbnails. Quality costs 3 credits and uses a slower model with sharper typography and stronger face consistency, which is worth it when a design leans on a recognisable person.',
  },
  {
    q: 'How do I pay?',
    a: 'Checkout runs through Razorpay in rupees, with card, UPI or netbanking. Credits are added as soon as the payment is confirmed.',
  },
  {
    q: 'What do I get for free?',
    a: `${FREE_PLAN.credits} credits when you sign up, no card required. That is enough to judge the output before paying anything.`,
  },
];

export default function PricingPage() {
  return (
    <main className='min-h-screen bg-background'>
      <div className='mx-auto max-w-6xl px-4 pt-28 pb-24 sm:px-6 sm:pt-32 lg:px-8'>
        <header className='max-w-3xl'>
          <h1 className='font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl'>
            Buy credits once.
            <br />
            Spend them on thumbnails.
          </h1>
          <p className='mt-5 max-w-xl text-base text-muted-foreground sm:text-lg'>
            No subscription and no monthly bill. Pick a pack, and each image
            draws from your balance: one credit for a draft thumbnail, three
            for quality.
          </p>
        </header>

        <section className='mt-14' aria-label='Plans'>
          <PlanGrid includeFree />
        </section>

        <section className='mt-24 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-14'>
          <div>
            <h2 className='font-serif text-4xl tracking-tight sm:text-5xl'>
              What a credit buys
            </h2>
            <p className='mt-4 max-w-md text-muted-foreground'>
              A pack&apos;s credit count is not its thumbnail count. Each image
              costs credits based on the model behind it, so a pack stretches
              furthest on Draft, the default and the right call for most
              uploads.
            </p>
          </div>
          <CreditCostTable />
        </section>

        <section className='mt-24'>
          <h2 className='font-serif text-4xl tracking-tight sm:text-5xl'>
            Not sure which pack?
          </h2>
          <p className='mt-3 mb-8 max-w-xl text-muted-foreground'>
            Tell us what you make in a typical week and we will suggest the
            pack that lasts about a month.
          </p>
          <CreditEstimator compact />
        </section>

        <section className='mt-24 grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-14'>
          <h2 className='font-serif text-4xl tracking-tight sm:text-5xl'>
            Questions
          </h2>
          <div className='divide-y border-y'>
            {FAQ.map((item) => (
              <details key={item.q} className='group py-1'>
                <summary className='flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium [&::-webkit-details-marker]:hidden'>
                  {item.q}
                  <span
                    aria-hidden
                    className='font-mono text-lg text-muted-foreground transition-transform group-open:rotate-45'
                  >
                    +
                  </span>
                </summary>
                <p className='pb-5 pr-8 text-sm leading-relaxed text-muted-foreground'>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className='mt-24 rounded-2xl border bg-card px-6 py-12 text-center sm:px-12 sm:py-16'>
          <h2 className='mx-auto max-w-2xl font-serif text-4xl tracking-tight sm:text-5xl'>
            Start with {FREE_PLAN.credits} free credits.
          </h2>
          <p className='mx-auto mt-3 max-w-md text-muted-foreground'>
            Make a few thumbnails, see if they beat what you have, then decide.
          </p>
          <div className='mt-8 flex justify-center'>
            <SignedOut>
              <Button asChild variant='brand' size='xl'>
                <Link href='/sign-up'>Create a free account</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild variant='brand' size='xl'>
                <Link href='/studio/text-to-image'>Open the studio</Link>
              </Button>
            </SignedIn>
          </div>
        </section>
      </div>
    </main>
  );
}
