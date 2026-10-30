'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { m, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/components/motion/hooks';

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
  '[mask-image:linear-gradient(to_bottom,transparent_calc(100%-9rem),black_calc(100%-5rem))] md:[mask-image:linear-gradient(to_bottom,transparent_calc(100%-12rem),black_calc(100%-8rem))]'; // taste-skill-ignore

/**
 * The hero's section and its two engraving layers. As the page scrolls the
 * backdrop drifts down (slower than the page) and the fern band rises a
 * little (faster), so the mockup sits between two depths.
 */
export const HeroParallax = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const backY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const frontY = useTransform(scrollYProgress, [0, 1], [0, -36]);

  return (
    <section
      ref={ref}
      className='relative isolate overflow-hidden pt-32 pb-28 md:pt-40 md:pb-40'
    >
      <m.div
        aria-hidden
        className={`-z-10 ${ART_BOX}`}
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

      <m.div
        aria-hidden
        className={`pointer-events-none z-20 ${ART_BOX} ${FOREGROUND_MASK}`}
        style={{ y: reduce ? 0 : frontY }}
      >
        <Image
          src={HERO_ART}
          alt=''
          fill
          sizes='100vw'
          className='engraving object-cover object-bottom'
        />
      </m.div>
    </section>
  );
};
