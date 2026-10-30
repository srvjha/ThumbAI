import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_PLAN } from '@/config/plans';
import { StudioMockup } from './StudioMockup';

const HERO_ART = '/art/hero-engraving.webp';

// Taller than the section and pinned to its bottom, so the coastline rises
// to meet the top of the studio window instead of hiding behind it. Only
// blank sky is clipped off the top.
const ART_BOX = 'absolute inset-x-0 bottom-0 h-[125%]';

/*
 * The engraving is drawn twice at identical geometry: once behind everything,
 * and once above the studio mockup, masked to its bottom band, so the engraved
 * foreground appears to grow over the product's lower edge. The mask is not a
 * visible gradient; it only decides where the top copy shows.
 */
const FOREGROUND_MASK =
  '[mask-image:linear-gradient(to_bottom,transparent_calc(100%-11rem),black_calc(100%-6rem))] md:[mask-image:linear-gradient(to_bottom,transparent_calc(100%-15rem),black_calc(100%-8rem))]'; // taste-skill-ignore

const ForegroundBand = () => (
  <div
    aria-hidden
    className={`pointer-events-none z-20 ${ART_BOX} ${FOREGROUND_MASK}`}
  >
    <Image
      src={HERO_ART}
      alt=''
      fill
      sizes='100vw'
      className='object-cover object-bottom'
    />
  </div>
);

export const Hero = () => (
  <section className='relative isolate overflow-hidden pt-32 pb-28 md:pt-40 md:pb-40'>
    <div aria-hidden className={`-z-10 ${ART_BOX}`}>
      <Image
        src={HERO_ART}
        alt=''
        fill
        priority
        sizes='100vw'
        className='object-cover object-bottom'
      />
    </div>

    <div className='relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-4xl text-center'>
        <h1 className='font-serif text-[clamp(2.75rem,9vw,7.25rem)] leading-[0.95] tracking-[-0.02em] text-balance'>
          Thumbnails that earn the click.
        </h1>
        <p className='mx-auto mt-8 max-w-xl text-lg leading-relaxed text-pretty'>
          Describe the video, upload your face, or paste a blog link. ThumbAI
          renders a YouTube thumbnail, a Shorts cover or a blog header, with
          the title spelled right.
        </p>
        <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6'>
          <Button asChild variant='brand' size='xl'>
            <Link href='/studio/text-to-image'>
              Open the studio <ArrowRight />
            </Link>
          </Button>
          <Link
            href='#samples'
            className='rounded-md bg-background/80 px-2 py-1 text-sm font-medium text-foreground underline-offset-4 hover:underline'
          >
            See what it makes
          </Link>
        </div>
        <p className='mt-5 text-sm text-foreground/75'>
          {FREE_PLAN.credits} free credits on signup. No card.
        </p>
      </div>

      <div className='relative z-10 mx-auto mt-16 max-w-5xl md:mt-24'>
        <StudioMockup />
      </div>
    </div>

    <ForegroundBand />
  </section>
);
