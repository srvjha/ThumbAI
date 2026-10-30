'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';

// Layout animations need domMax; it loads in its own chunk after first paint.
const loadLayoutFeatures = () =>
  import('./layout-features').then((mod) => mod.default);

/** Small feature set for `m.*` components, plus OS-level reduced motion. */
export const MotionRoot = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion='user'>{children}</MotionConfig>
  </LazyMotion>
);

/** Wrap parts that use `layout`; the extra features arrive asynchronously. */
export const LayoutMotion = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={loadLayoutFeatures} strict>
    <MotionConfig reducedMotion='user'>{children}</MotionConfig>
  </LazyMotion>
);
