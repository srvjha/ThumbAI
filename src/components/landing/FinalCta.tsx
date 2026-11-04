import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_PLAN } from '@/config/plans';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { H2 } from './type';

/* The band is the footer's paper, so the close runs on into the engraving. */
export const FinalCta = () => (
  <section className='bg-secondary pt-28 pb-12 md:pt-40 md:pb-16 dark:bg-transparent'>
    <Reveal
      stagger={0.09}
      amount={0.3}
      className='mx-auto max-w-3xl px-4 text-center sm:px-6'
    >
      <RevealItem as='h2' className={H2}>
        Frame your next upload.
      </RevealItem>
      <RevealItem className='mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row'>
        <Button asChild variant='brand' size='xl' className='rounded-lg'>
          <Link href='/studio/text-to-image'>
            Open the studio <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant='outline' size='xl' className='rounded-lg'>
          <Link href='/pricing'>See pricing</Link>
        </Button>
      </RevealItem>
      <RevealItem as='p' className='mt-4 text-sm text-muted-foreground'>
        {FREE_PLAN.credits} free credits on signup. No card.
      </RevealItem>
    </Reveal>
  </section>
);
