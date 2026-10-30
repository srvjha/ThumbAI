import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SAMPLES } from './samples';

export const FinalCta = () => (
  <section className='pb-24 md:pb-36'>
    <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='grid items-center gap-10 overflow-hidden rounded-3xl bg-brand p-6 text-brand-foreground sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:p-14'>
        <div>
          <h2 className='font-serif text-[clamp(2.25rem,5vw,4.25rem)] leading-[1] tracking-[-0.02em] text-balance'>
            Your next upload deserves a better frame.
          </h2>
          <p className='mt-6 max-w-md text-lg leading-relaxed'>
            Write one line about the video. You will have a thumbnail to
            judge before the export finishes.
          </p>
          <Button
            asChild
            size='xl'
            className='mt-8 bg-card text-foreground shadow-xs hover:bg-background'
          >
            <Link href='/studio/text-to-image'>
              Open the studio <ArrowRight />
            </Link>
          </Button>
        </div>

        {/* A slice of the studio: one render and the follow-up edit asked of it. */}
        <div data-ui className='rounded-2xl bg-card p-3 text-foreground sm:p-4'>
          <div className='relative aspect-video overflow-hidden rounded-lg'>
            <Image
              src={SAMPLES.editNotes.src}
              alt={SAMPLES.editNotes.alt}
              fill
              sizes='(min-width: 1024px) 560px, 100vw'
              className='object-cover'
            />
          </div>
          <div className='mt-3 flex items-center gap-2 rounded-lg bg-background p-2 pl-3 text-sm'>
            <span className='min-w-0 flex-1 truncate'>
              Make the notes yellow and tilt the title
            </span>
            <span className='btn-brand shrink-0 rounded-md px-3 py-1.5 text-xs font-medium'>
              Refine &middot; 2 credits
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
