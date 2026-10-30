import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_PLAN } from '@/config/plans';
import { CSS_ENTER, CSS_RISE } from '@/components/motion/tokens';
import { HeroParallax } from './HeroParallax';
import { StudioMockup } from './StudioMockup';

/*
 * The load sequence is CSS, not JS: it starts with the first paint, so the
 * headline is readable within ~300ms even before hydration. Order: the two
 * headline lines, the subline, the actions, then the studio rising.
 */
export const Hero = () => (
  <HeroParallax>
    <div className='relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-4xl text-center'>
        <h1 className='font-serif text-[clamp(2.5rem,7.4vw,5.5rem)] leading-[1] text-balance'>
          <span className={`inline-block ${CSS_ENTER}`}>Thumbnails that</span>{' '}
          <span
            className={`inline-block ${CSS_ENTER} [--tw-animation-delay:90ms]`}
          >
            earn the click.
          </span>
        </h1>
        <p
          className={`mx-auto mt-8 max-w-xl text-lg leading-relaxed text-pretty ${CSS_ENTER} [--tw-animation-delay:220ms]`}
        >
          Describe the video, upload your face, or paste a blog link. ThumbAI
          renders a YouTube thumbnail, a Shorts cover or a blog header, with the
          title spelled right.
        </p>
        <div
          className={`mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6 ${CSS_ENTER} [--tw-animation-delay:320ms]`}
        >
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
        <p
          className={`mt-5 text-sm text-foreground/75 ${CSS_ENTER} [--tw-animation-delay:360ms]`}
        >
          {FREE_PLAN.credits} free credits on signup. No card.
        </p>
      </div>

      {/* Rises out of the landscape: 60px of travel and a 0.97 scale. */}
      <div
        className={`relative z-10 mx-auto mt-16 max-w-5xl md:mt-24 ${CSS_RISE} [--tw-animation-delay:420ms]`}
      >
        <StudioMockup />
      </div>
    </div>
  </HeroParallax>
);
