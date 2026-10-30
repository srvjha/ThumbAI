import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal, RevealItem } from '@/components/motion/Reveal';
import { RefineDemo } from './RefineDemo';

export const FinalCta = () => (
  <section className='pb-24 md:pb-36'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <Reveal
        stagger={0.09}
        amount={0.25}
        className='grid items-center gap-10 overflow-hidden rounded-3xl bg-brand p-6 text-brand-foreground sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:p-14'
      >
        <div>
          <RevealItem
            as='h2'
            className='font-serif text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.04] text-balance'
          >
            Your next upload deserves a better frame.
          </RevealItem>
          <RevealItem as='p' className='mt-6 max-w-md text-lg leading-relaxed'>
            Write one line about the video. You will have a thumbnail to judge
            before the export finishes.
          </RevealItem>
          <RevealItem>
            <Button
              asChild
              size='xl'
              className='mt-8 bg-card text-foreground shadow-xs hover:bg-background'
            >
              <Link href='/studio/text-to-image'>
                Open the studio <ArrowRight />
              </Link>
            </Button>
          </RevealItem>
        </div>

        <RevealItem>
          <RefineDemo />
        </RevealItem>
      </Reveal>
    </div>
  </section>
);
