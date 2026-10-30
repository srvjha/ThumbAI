'use client';

import { useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Hover + keyboard cursor over an evenly spaced series. Pointer snaps to the
 * nearest slot; arrow keys step through it so the readout works without a mouse.
 */
export const useSeriesCursor = ({
  count,
  left,
  slot,
}: {
  count: number;
  left: number;
  slot: number;
}) => {
  const [index, setIndex] = useState<number | null>(null);
  const clamp = (value: number) => Math.min(count - 1, Math.max(0, value));

  return {
    index,
    clear: () => setIndex(null),
    pointerProps: {
      onPointerMove: (event: PointerEvent<SVGElement>) => {
        if (!count || !slot) return;
        const box = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - box.left - left;
        setIndex(clamp(Math.floor(x / slot)));
      },
      onPointerLeave: () => setIndex(null),
    },
    keyProps: {
      tabIndex: 0,
      onFocus: () => setIndex((current) => current ?? count - 1),
      onBlur: () => setIndex(null),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          const delta = event.key === 'ArrowLeft' ? -1 : 1;
          setIndex((current) => clamp((current ?? count - 1) + delta));
        } else if (event.key === 'Home') {
          setIndex(0);
        } else if (event.key === 'End') {
          setIndex(count - 1);
        } else if (event.key === 'Escape') {
          setIndex(null);
        }
      },
    },
  };
};
