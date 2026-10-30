'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Download, Link2, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGeneration } from '@/hooks/user/generations';
import { StatusChip } from './StatusChip';
import { aspectClass } from './GenerationCard';
import { downloadImage, imageExtension } from './download';
import {
  ASPECT_LABELS,
  TIER_LABELS,
  WORKFLOW_LABELS,
  formatDateTime,
  isRunning,
  studioRouteFor,
} from './format';
import type { GenerationItem } from './types';

const copyText = async (text: string, message: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error('Could not copy to the clipboard');
  }
};

const Detail = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className='flex items-baseline justify-between gap-4 py-2 text-sm'>
    <dt className='text-muted-foreground'>{label}</dt>
    <dd className='text-right'>{value}</dd>
  </div>
);

/** Full view of one generation: every image, the prompt and its settings. */
export const GenerationDialog = ({
  item,
  onClose,
}: {
  item: GenerationItem | null;
  onClose: () => void;
}) => {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const { data: detail } = useGeneration(item?.id ?? null);

  useEffect(() => {
    setActive(0);
    setCopied(false);
  }, [item?.id]);

  // Prefer the fresher detail row (a pending job may have finished since).
  const current = detail && detail.id === item?.id ? detail : item;
  const images = current?.image_url ?? [];
  const image = images[active] ?? images[0];
  const tier =
    current?.model_tier ??
    (current?.model_used === 'IMAGE_TO_IMAGE' ? 'EDIT' : null);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto bg-card p-0 sm:max-w-5xl'>
        {current && (
          <div className='grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
            <div className='space-y-3 border-b bg-background p-4 sm:p-5 md:border-r md:border-b-0'>
              <div
                className={cn(
                  'relative mx-auto overflow-hidden rounded-lg border bg-secondary',
                  aspectClass(current.aspect_ratio),
                  current.aspect_ratio === '9:16'
                    ? 'max-h-[60svh] w-auto max-w-full'
                    : 'w-full',
                )}
              >
                {image ? (
                  <img
                    src={image}
                    alt={current.prompt || 'Generated image'}
                    className='h-full w-full object-contain'
                  />
                ) : (
                  <div className='flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground'>
                    {isRunning(current.status)
                      ? 'Still generating. This view refreshes when it lands.'
                      : 'This generation failed. Its credits were refunded.'}
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type='button'
                      onClick={() => setActive(index)}
                      aria-label={`Show image ${index + 1} of ${images.length}`}
                      aria-pressed={index === active}
                      className={cn(
                        'shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                        current.aspect_ratio === '9:16'
                          ? 'h-20 w-[45px]'
                          : 'h-12 w-[86px]',
                        index === active
                          ? 'border-brand'
                          : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={url}
                        alt=''
                        className='h-full w-full object-cover'
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className='flex flex-col gap-5 p-4 sm:p-5'>
              <div className='pr-8'>
                <div className='flex items-center gap-2'>
                  <DialogTitle className='font-serif text-2xl font-normal tracking-tight'>
                    {WORKFLOW_LABELS[current.model_used ?? 'UNKNOWN']}
                  </DialogTitle>
                  <StatusChip status={current.status} />
                </div>
                <DialogDescription className='mt-1'>
                  {formatDateTime(current.createdAt)}
                </DialogDescription>
              </div>

              <div>
                <div className='mb-1.5 flex items-center justify-between'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    Prompt
                  </span>
                  {current.prompt && (
                    <button
                      type='button'
                      onClick={() => {
                        copyText(current.prompt, 'Prompt copied');
                        setCopied(true);
                      }}
                      className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
                    >
                      {copied ? (
                        <Check className='size-3' />
                      ) : (
                        <Copy className='size-3' />
                      )}
                      Copy
                    </button>
                  )}
                </div>
                <p className='max-h-40 overflow-y-auto rounded-lg border bg-background p-3 text-sm leading-relaxed break-words'>
                  {current.prompt || (
                    <span className='text-muted-foreground'>
                      No prompt recorded
                    </span>
                  )}
                </p>
                {detail?.enhanced_prompt && (
                  <details className='mt-2 text-sm'>
                    <summary className='cursor-pointer text-xs text-muted-foreground hover:text-foreground'>
                      Prompt the model received
                    </summary>
                    <p className='mt-2 max-h-48 overflow-y-auto rounded-lg border bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground'>
                      {detail.enhanced_prompt}
                    </p>
                  </details>
                )}
              </div>

              <dl className='divide-y border-y'>
                <Detail label='Tier' value={tier ? TIER_LABELS[tier] : '—'} />
                <Detail
                  label='Aspect ratio'
                  value={
                    ASPECT_LABELS[current.aspect_ratio ?? 'UNKNOWN'] ??
                    current.aspect_ratio
                  }
                />
                <Detail
                  label='Images'
                  value={
                    <span className='font-mono tabular-nums'>
                      {images.length || current.num_of_images || '—'}
                    </span>
                  }
                />
                {detail && (
                  <Detail
                    label='Credits (est.)'
                    value={
                      <span className='font-mono tabular-nums'>
                        {current.status === 'FAILED'
                          ? 0
                          : detail.estimated_credits}
                      </span>
                    }
                  />
                )}
                {detail?.seed != null && (
                  <Detail
                    label='Seed'
                    value={
                      <span className='font-mono tabular-nums'>
                        {detail.seed}
                      </span>
                    }
                  />
                )}
              </dl>

              <div className='mt-auto grid gap-2 sm:grid-cols-2'>
                <Button
                  variant='outline'
                  disabled={!image}
                  onClick={() =>
                    image &&
                    downloadImage(
                      image,
                      `thumbai-${current.id.slice(0, 8)}-${active + 1}.${imageExtension(image, detail?.content_type ?? 'png')}`,
                    )
                  }
                >
                  <Download />
                  Download
                </Button>
                <Button
                  variant='outline'
                  disabled={!image}
                  onClick={() => image && copyText(image, 'Image link copied')}
                >
                  <Link2 />
                  Copy link
                </Button>
                <Button variant='brand' asChild className='sm:col-span-2'>
                  <Link
                    href={`${studioRouteFor(current.model_used)}?from=${current.id}`}
                  >
                    <Wand2 />
                    Open in studio
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
