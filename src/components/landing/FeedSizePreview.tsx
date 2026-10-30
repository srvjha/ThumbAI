'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { SAMPLES } from './samples';

// The widths a thumbnail is actually seen at.
const SIZES = [
  { id: 'full', label: 'Full size', width: null },
  { id: 'desktop', label: 'Desktop feed', width: 320 },
  { id: 'phone', label: 'Phone feed', width: 168 },
] as const;

type SizeId = (typeof SIZES)[number]['id'];

/** Shrinks one real render to feed sizes, so the claim can be checked by eye. */
export const FeedSizePreview = () => {
  const [size, setSize] = useState<SizeId>('desktop');
  const active = SIZES.find((s) => s.id === size)!;

  return (
    <div className='rounded-2xl bg-card p-4 sm:p-6'>
      <div
        role='radiogroup'
        aria-label='Preview size'
        className='grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm'
      >
        {SIZES.map((s) => (
          <button
            key={s.id}
            type='button'
            role='radio'
            aria-checked={size === s.id}
            onClick={() => setSize(s.id)}
            className={cn(
              'rounded-md px-2 py-2 transition-colors',
              size === s.id
                ? 'bg-card font-medium text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
            {s.width && (
              <span className='hidden text-muted-foreground sm:inline'>
                {' '}
                {s.width}px
              </span>
            )}
          </button>
        ))}
      </div>

      <div className='mt-4 flex aspect-[16/10] items-center justify-center rounded-lg bg-background p-4'>
        <figure
          className='transition-[width] duration-500 ease-out motion-reduce:transition-none'
          style={{ width: active.width ? `${active.width}px` : '100%', maxWidth: '100%' }}
        >
          <div className='relative aspect-video overflow-hidden rounded-md'>
            <Image
              src={SAMPLES.fitness.src}
              alt={SAMPLES.fitness.alt}
              fill
              sizes='(min-width: 1024px) 560px, 100vw'
              className='object-cover'
            />
          </div>
          <figcaption
            className={cn(
              'pt-2 leading-snug',
              active.width === 168 ? 'text-[11px]' : 'text-sm',
            )}
          >
            <span className='block font-medium'>I ran at 5am for 30 days</span>
            <span className='text-muted-foreground'>Tempo Club &middot; 2 days ago</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
};
