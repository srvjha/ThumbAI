'use client';

import { m, type Variants } from 'framer-motion';
import { EASE } from '@/components/motion/tokens';

// Drawn left to right as the steps arrive; it inherits 'hidden'/'show'
// from the surrounding <Reveal>.
const variants: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 1.1, ease: EASE, delay: 0.15 } },
};

/** The line joining the three step markers, desktop only. */
export const StepConnector = () => (
  <m.li
    aria-hidden
    role='presentation'
    variants={variants}
    className='absolute top-[5px] left-[30px] hidden h-0.5 origin-left bg-brand/40 md:block md:right-[calc((100%-4rem)/3-30px)]'
  />
);
