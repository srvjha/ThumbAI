'use client';

import { useSyncExternalStore } from 'react';

/** Matches a media query; false on the server and during hydration. */
export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

const noop = () => () => {};

/** The modifier key label for shortcuts: ⌘ on Apple platforms, else Ctrl. */
export const useModKey = () =>
  useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'),
    () => '⌘',
  );
