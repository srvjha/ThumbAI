'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASE } from './tokens';
import { usePrefersReducedMotion } from './hooks';

type CountUpProps = {
  to: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  /** Formats with this locale's digit grouping, e.g. 'en-IN'. */
  locale?: string;
  duration?: number;
  /** Which edge stays put while the digits change. */
  align?: 'start' | 'end';
  className?: string;
};

/**
 * Counts to `to` once, when it scrolls into view. The server renders the final
 * number, so without JavaScript or with reduced motion it simply reads right.
 */
export const CountUp = ({
  to,
  from = 0,
  prefix = '',
  suffix = '',
  locale = 'en-IN',
  duration = 1.1,
  align = 'start',
  className,
}: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = usePrefersReducedMotion();
  const format = (n: number) =>
    `${prefix}${Math.round(n).toLocaleString(locale)}${suffix}`;
  const finalText = format(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = finalText;
      return;
    }
    if (!inView) {
      // Park at the start value until it is seen.
      el.textContent = format(from);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // format is derived from the props listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, from, to, prefix, suffix, locale, duration]);

  return (
    <span className={cn('inline-grid tabular-nums', className)}>
      {/* The final figure, invisible, holds the width: no shift while counting. */}
      <span aria-hidden className='invisible col-start-1 row-start-1'>
        {finalText}
      </span>
      <span
        ref={ref}
        aria-hidden
        className={cn(
          'col-start-1 row-start-1',
          align === 'end' ? 'justify-self-end' : 'justify-self-start',
        )}
      >
        {finalText}
      </span>
      <span className='sr-only'>{finalText}</span>
    </span>
  );
};
