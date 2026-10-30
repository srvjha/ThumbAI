'use client';

import { useCallback, useState } from 'react';

/** Tracks an element's content width. Returns 0 until it has been measured. */
export const useElementWidth = <T extends HTMLElement>() => {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(node);
    setWidth(Math.floor(node.getBoundingClientRect().width));
    // React 19 runs a ref callback's return value as its cleanup.
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};
