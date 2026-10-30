import { ImageOff, Images, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from './StatusChip';
import { WORKFLOW_LABELS, formatRelative, isRunning } from './format';
import type { GenerationItem } from './types';

export const aspectClass = (ratio: string | null) =>
  ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

/** The image area when there's no image to show yet (or ever). */
const Placeholder = ({ item }: { item: GenerationItem }) => (
  <div className='flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary p-4 text-center text-xs text-muted-foreground'>
    {isRunning(item.status) ? (
      <>
        <Loader2 className='size-5 animate-spin text-brand' />
        Generating
      </>
    ) : (
      <>
        <ImageOff className='size-5' />
        {item.status === 'FAILED' ? 'Credits refunded' : 'No image'}
      </>
    )}
  </div>
);

export const GenerationCard = ({
  item,
  onOpen,
}: {
  item: GenerationItem;
  onOpen: (item: GenerationItem) => void;
}) => {
  const cover = item.image_url[0];
  const count = item.image_url.length;
  return (
    <button
      type='button'
      onClick={() => onOpen(item)}
      className='group block w-full overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
    >
      <div
        className={cn(
          'relative w-full overflow-hidden bg-secondary',
          aspectClass(item.aspect_ratio),
        )}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.prompt || 'Generated image'}
            loading='lazy'
            decoding='async'
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]'
          />
        ) : (
          <Placeholder item={item} />
        )}
        <StatusChip status={item.status} className='absolute left-2 top-2' />
        {count > 1 && (
          <span className='absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 font-mono text-[11px] tabular-nums'>
            <Images className='size-3' />
            {count}
          </span>
        )}
      </div>
      <div className='space-y-1.5 p-3'>
        <p className='line-clamp-2 text-sm leading-snug'>
          {item.prompt || (
            <span className='text-muted-foreground'>No prompt recorded</span>
          )}
        </p>
        <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='truncate'>
            {WORKFLOW_LABELS[item.model_used ?? 'UNKNOWN']}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={item.createdAt} className='shrink-0'>
            {formatRelative(item.createdAt)}
          </time>
        </p>
      </div>
    </button>
  );
};
