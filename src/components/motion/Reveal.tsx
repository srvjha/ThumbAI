'use client';

import type { ReactNode } from 'react';
import { m, type Variants } from 'framer-motion';
import { EASE } from './tokens';
import { usePrefersReducedMotion } from './hooks';

type Tag =
  | 'div'
  | 'section'
  | 'ul'
  | 'ol'
  | 'li'
  | 'p'
  | 'span'
  | 'figure'
  | 'dl'
  | 'article'
  | 'h2'
  | 'h3'
  | 'nav';

const hidden = { opacity: 0, y: 16, filter: 'blur(6px)' };
const shown = { opacity: 1, y: 0, filter: 'blur(0px)' };

const showTransition = (reduce: boolean, delay = 0) =>
  // Reduced motion: a short fade only, no travel and no blur.
  reduce
    ? { duration: 0.25, delay, y: { duration: 0 }, filter: { duration: 0 } }
    : { duration: 0.7, ease: EASE, delay };

const itemVariants = (reduce: boolean, delay?: number): Variants => ({
  hidden,
  show: { ...shown, transition: showTransition(reduce, delay) },
});

type RevealProps = {
  as?: Tag;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Seconds between children. Children must be <RevealItem>s. */
  stagger?: number;
  /** Share of the element that must be visible before it plays. */
  amount?: number;
  id?: string;
};

/**
 * Fades, rises 16px and unblurs once, when it scrolls into view. With
 * `stagger`, it orchestrates its <RevealItem> children instead.
 */
export const Reveal = ({
  as = 'div',
  children,
  className,
  delay = 0,
  stagger,
  amount = 0.2,
  id,
}: RevealProps) => {
  const reduce = usePrefersReducedMotion();
  const Comp = m[as] as typeof m.div;

  const variants: Variants =
    stagger === undefined
      ? itemVariants(reduce, delay)
      : {
          hidden: {},
          show: {
            transition: {
              staggerChildren: reduce ? 0 : stagger,
              delayChildren: delay,
            },
          },
        };

  return (
    <Comp
      id={id}
      className={className}
      variants={variants}
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, amount }}
    >
      {children}
    </Comp>
  );
};

/** One staggered child of a <Reveal stagger>. */
export const RevealItem = ({
  as = 'div',
  children,
  className,
}: {
  as?: Tag;
  children: ReactNode;
  className?: string;
}) => {
  const reduce = usePrefersReducedMotion();
  const Comp = m[as] as typeof m.div;
  return (
    <Comp className={className} variants={itemVariants(reduce)}>
      {children}
    </Comp>
  );
};
