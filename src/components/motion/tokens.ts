/** Shared motion tokens: one easing curve, one spring, one entrance. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const SPRING = {
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.9,
} as const;

/**
 * The page-load entrance as CSS (tw-animate-css), for content above the fold:
 * it plays before hydration, so the headline never waits on JavaScript.
 */
const CSS_BASE =
  'animate-in fade-in fill-mode-both ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none';

/** Text: rise 16px, unblur 6px. */
export const CSS_ENTER = `${CSS_BASE} blur-in-6 slide-in-from-bottom-4 duration-700`;

/** A large surface: rise 60px from a 0.97 scale. */
export const CSS_RISE = `${CSS_BASE} slide-in-from-bottom-[60px] zoom-in-97 duration-1000`;
