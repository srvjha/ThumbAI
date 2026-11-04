'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { m, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/components/motion/hooks';

const HERO_ART = '/art/hero-ground.webp';

// Only the coastline and foliage, cut out on transparent, pinned to the bottom
// so it flanks the studio window and the headline stands on clean ground.
const ART_BOX = 'absolute inset-x-0 bottom-0 h-[clamp(14rem,25.8vw,32rem)]';

/*
 * The art only flanks the window: the middle is masked out so the product's
 * edge stays clean, and the bottom dissolves into the page rather than
 * stopping on a line. Masks, not visible gradients.
 */
const FLANK_MASK =
  '[mask-composite:intersect] [mask-image:linear-gradient(90deg,#000_10%,transparent_24%,transparent_76%,#000_90%),linear-gradient(to_bottom,#000_40%,transparent_74%)]'; // taste-skill-ignore

/**
 * The hero's section and its engraving. As the page scrolls the coastline
 * drifts down, slower than the page, so the window lifts away from it.
 */
export const HeroParallax = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const backY = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    <section
      ref={ref}
      className='relative isolate overflow-hidden pt-24 pb-24 md:pt-28 md:pb-32'
    >
      <m.div
        aria-hidden
        className={`-z-10 hidden md:block ${ART_BOX} ${FLANK_MASK}`}
        style={{ y: reduce ? 0 : backY }}
      >
        <Image
          src={HERO_ART}
          alt=''
          fill
          priority
          sizes='100vw'
          className='engraving object-cover object-bottom'
        />
      </m.div>

      {children}
    </section>
  );
};
