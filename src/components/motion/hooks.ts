'use client';

import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true after; keeps the first client render identical to the server's. */
export const useMounted = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * useReducedMotion, gated on mount. The raw hook reads matchMedia during the
 * first client render, which would make that render differ from the server's.
 */
export const usePrefersReducedMotion = () => {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  return mounted && !!reduce;
};

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
};

/** Whether the tab is in the foreground. */
export const usePageVisible = () =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );
