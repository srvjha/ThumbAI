'use client';

import { useMemo, type ReactNode } from 'react';
import { useElementWidth } from './useElementWidth';
import type { GenerationItem } from './types';

// Relative heights per unit of column width: the image plus the caption.
const CAPTION = 0.32;
const heightOf = (item: GenerationItem) =>
  (item.aspect_ratio === '9:16' ? 16 / 9 : 9 / 16) + CAPTION;

const columnsFor = (width: number) =>
  width >= 1100 ? 4 : width >= 760 ? 3 : 2;

/**
 * Greedy shortest-column masonry. Unlike CSS columns, appending a page never
 * moves cards that are already placed, so "Load more" doesn't reshuffle.
 */
export const MasonryGrid = ({
  items,
  renderItem,
}: {
  items: GenerationItem[];
  renderItem: (item: GenerationItem) => ReactNode;
}) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const count = width ? columnsFor(width) : 2;

  const columns = useMemo(() => {
    const cols: GenerationItem[][] = Array.from({ length: count }, () => []);
    const heights = Array<number>(count).fill(0);
    for (const item of items) {
      const shortest = heights.indexOf(Math.min(...heights));
      cols[shortest].push(item);
      heights[shortest] += heightOf(item);
    }
    return cols;
  }, [items, count]);

  return (
    <div ref={ref} className='flex items-start gap-3 sm:gap-4'>
      {columns.map((column, index) => (
        <div
          key={index}
          className='flex min-w-0 flex-1 flex-col gap-3 sm:gap-4'
        >
          {column.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      ))}
    </div>
  );
};
