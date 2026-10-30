'use client';

import { Eye, Pin, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  SHORTLIST_LIMIT,
  useStudioStore,
  type PinnedImage,
} from '@/store/studioStore';
import { cn } from '@/lib/utils';

/** The feed mock is 16:9 only, so Shorts covers sit out of the preview. */
export const previewable = (shortlist: PinnedImage[]) =>
  shortlist.filter((p) => p.aspectRatio !== '9:16');

/**
 * The Test & Compare set: up to three pinned images, shown in the header,
 * that open together in the feed preview.
 */
export const CompareSet = ({ onPreview }: { onPreview: () => void }) => {
  const shortlist = useStudioStore((s) => s.shortlist);
  const togglePin = useStudioStore((s) => s.togglePin);
  const clear = useStudioStore((s) => s.clearShortlist);
  const usable = previewable(shortlist);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type='button' variant='outline' size='sm' className='gap-2'>
          {shortlist.length > 0 ? (
            <span className='flex -space-x-2' aria-hidden>
              {shortlist.map((p) => (
                <img
                  key={p.url}
                  src={p.url}
                  alt=''
                  className={cn(
                    'h-5 rounded-[3px] object-cover ring-2 ring-card',
                    p.aspectRatio === '9:16' ? 'w-3' : 'w-9',
                  )}
                />
              ))}
            </span>
          ) : (
            <Pin className='size-4' />
          )}
          Compare
          <span className='tabular-nums text-muted-foreground'>
            {shortlist.length}/{SHORTLIST_LIMIT}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-80 p-3'>
        <div className='mb-2 flex items-baseline justify-between'>
          <p className='text-sm font-medium'>Compare set</p>
          {shortlist.length > 0 && (
            <button
              type='button'
              onClick={clear}
              className='text-xs text-muted-foreground hover:text-foreground'
            >
              Clear
            </button>
          )}
        </div>
        {shortlist.length === 0 ? (
          <p className='rounded-lg border border-dashed p-3 text-xs text-muted-foreground'>
            Pin up to {SHORTLIST_LIMIT} results from the canvas, then preview
            them side by side in a feed, the way viewers will see them.
          </p>
        ) : (
          <ul className='grid grid-cols-3 gap-2'>
            {shortlist.map((p) => (
              <li key={p.url} className='relative'>
                <img
                  src={p.url}
                  alt='Pinned result'
                  className={cn(
                    'w-full rounded-md border object-cover',
                    p.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video',
                  )}
                />
                <button
                  type='button'
                  onClick={() => togglePin(p)}
                  aria-label='Unpin'
                  className='absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-xs hover:text-foreground'
                >
                  <X className='size-3' />
                </button>
              </li>
            ))}
          </ul>
        )}
        {shortlist.length > usable.length && (
          <p className='mt-2 text-[11px] text-muted-foreground'>
            Shorts covers stay out of the feed preview; it shows 16:9 only.
          </p>
        )}
        <Button
          type='button'
          variant='brand'
          size='sm'
          className='mt-3 w-full'
          disabled={usable.length === 0}
          onClick={onPreview}
        >
          <Eye className='size-4' />
          Preview in feed
        </Button>
      </PopoverContent>
    </Popover>
  );
};
