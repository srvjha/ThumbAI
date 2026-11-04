import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FREE_PLAN } from '@/config/plans';
import { CSS_ENTER, CSS_RISE } from '@/components/motion/tokens';
import { HeroHeadline } from './HeroHeadline';
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
      <div className='mx-auto text-center'>
        <HeroHeadline />
        <p
          className={`mx-auto mt-5 max-w-2xl text-lg leading-snug text-pretty sm:text-xl ${CSS_ENTER} [--tw-animation-delay:220ms]`}
        >
          Describe the video, upload your face, or paste a blog link. Get a
          thumbnail, Shorts cover or blog header with the title spelled right.
        </p>
        <div
          className={`mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row ${CSS_ENTER} [--tw-animation-delay:320ms]`}
        >
          <Button asChild variant='brand' size='xl' className='rounded-lg'>
            <Link href='/studio/text-to-image'>
              Open the studio <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant='secondary' size='xl' className='rounded-lg'>
            <Link href='#samples'>See what it makes</Link>
          </Button>
        </div>
        <p
          className={`mt-4 text-sm text-muted-foreground ${CSS_ENTER} [--tw-animation-delay:360ms]`}
        >
          {FREE_PLAN.credits} free credits on signup. No card.
        </p>
      </div>

      {/* Rises out of the landscape: 60px of travel and a 0.97 scale. */}
      <div
        // taste-skill-ignore: the one thing on the page that really floats.
        className={`relative z-10 mx-auto mt-12 max-w-5xl rounded-2xl shadow-[0_24px_70px_-24px_rgb(18_23_43/0.28)] md:mt-16 dark:shadow-none ${CSS_RISE} [--tw-animation-delay:420ms]`}
      >
        <StudioMockup />
      </div>
    </div>
  </HeroParallax>
);
