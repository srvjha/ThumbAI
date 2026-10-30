'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { usePageVisible, usePrefersReducedMotion } from './hooks';

export type LoopStep<K extends string> = {
  id: K;
  /** How long the step lasts, in ms; a function gets the cycle number. */
  ms: number | ((cycle: number) => number);
};

type Options = {
  /** Step to start (and, with reduced motion, stay) on. Pick a representative one. */
  initial?: number;
  enabled?: boolean;
};

/**
 * A timed step machine for looping demos. It only advances while its element
 * is on screen, the tab is visible and the visitor has not asked for reduced
 * motion; otherwise it holds the current step.
 */
export const useLoop = <K extends string, E extends Element = HTMLDivElement>(
  steps: readonly LoopStep<K>[],
  { initial = 0, enabled = true }: Options = {},
) => {
  const ref = useRef<E>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const visible = usePageVisible();
  const reduce = usePrefersReducedMotion();
  const [{ index, cycle }, setPos] = useState({ index: initial, cycle: 0 });

  const playing = enabled && !reduce && inView && visible;
  const current = steps[index];
  const ms = typeof current.ms === 'function' ? current.ms(cycle) : current.ms;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      setPos((p) =>
        p.index + 1 >= steps.length
          ? { index: 0, cycle: p.cycle + 1 }
          : { index: p.index + 1, cycle: p.cycle },
      );
    }, ms);
    return () => clearTimeout(timer);
  }, [playing, index, cycle, ms, steps.length]);

  return { ref, step: current.id, index, cycle, playing, reduce };
};
