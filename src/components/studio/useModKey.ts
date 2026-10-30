'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** The modifier key label for shortcuts: ⌘ on Apple platforms, else Ctrl. */
export const useModKey = () =>
  useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'),
    () => '⌘',
  );
