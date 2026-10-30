'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { m, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '@/components/motion/hooks';

/**
 * The footer engraving. The art's top quarter is blank paper, pulled up under
 * the text; it rises the last 48px into place as the page reaches the end.
 */
export const FooterArt = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end end'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);

  return (
    <div
      ref={ref}
      aria-hidden
      className='relative -z-10 -mt-[6vw] aspect-[2200/890] min-h-56 w-full'
    >
      <m.div className='absolute inset-0' style={{ y: reduce ? 0 : y }}>
        <Image
          src='/art/footer-engraving.webp'
          alt=''
          fill
          sizes='100vw'
          className='object-cover object-bottom'
        />
      </m.div>
    </div>
  );
};
