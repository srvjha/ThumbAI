'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import { ImageData, downloadImagesAsZip } from './imageUtils';
import { ImageActionButtons } from './ImageActionButtons';
import { CustomizeButton } from '../CustomizeDialog';
import { CanvasEmptyState, CanvasGenerating } from '../studio/CanvasStates';
import { RatioGlyph } from '../studio/AspectRatioPicker';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'generating' | 'in-progress' | 'completed';

interface ResultPanelProps {
  status: Status;
  displayImages: ImageData[];
  isGenerating: boolean;
  outputFormat: string;
  onEdit?: (selectedIdx: number) => void;
  renderCustomContent?: () => ReactNode;
  /** Opens the conversational editor. Rendered beside the other actions. */
  onCustomize?: () => void;
  hasChatMessages?: boolean;
  /** Ratios currently selected, used to shape the empty and loading frames. */
  ratios?: string[];
  /** Copy for the empty canvas. */
  empty?: { title: string; description: string; steps?: string[] };
}

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Ready',
  generating: 'Preparing',
  'in-progress': 'Rendering',
  completed: 'Done',
};

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => (
  <span className='flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground'>
    <span
      className={cn(
        'size-2 rounded-full',
        status === 'completed'
          ? 'bg-emerald-500'
          : status === 'idle'
            ? 'bg-muted-foreground/40'
            : 'animate-pulse bg-brand',
      )}
    />
    {STATUS_LABEL[status]}
  </span>
);

/** The studio canvas: empty frame, shaped skeleton, then results. */
export const ResultPanel: React.FC<ResultPanelProps> = ({
  status,
  displayImages,
  outputFormat,
  onEdit,
  renderCustomContent,
  onCustomize,
  hasChatMessages = false,
  ratios = ['16:9'],
  empty = {
    title: 'Your thumbnail appears here',
    description:
      'Fill in the panel on the left and press Generate. Each version you make stays here so you can compare them.',
  },
}) => {
  const [selected, setSelected] = useState(0);
  const prevCount = useRef(displayImages.length);

  // Jump to the first new image when results arrive or a refinement lands.
  useEffect(() => {
    const prev = prevCount.current;
    const count = displayImages.length;
    if (count > prev) setSelected(prev);
    else if (count < prev) setSelected(0);
    prevCount.current = count;
  }, [displayImages.length]);

  const active =
    displayImages[Math.min(selected, displayImages.length - 1)] ?? null;
  const activeIndex = Math.min(selected, displayImages.length - 1);

  const handleDownloadAll = async () => {
    if (displayImages.length === 0) return;

    try {
      toast.loading('Preparing zip file...', { id: 'zip-download' });
      await downloadImagesAsZip(displayImages, outputFormat, 'generated');
      toast.success('All images downloaded as zip!', { id: 'zip-download' });
    } catch (error) {
      toast.error('Failed to create zip file. Please try again.', {
        id: 'zip-download',
      });
    }
  };

  const busy = status === 'generating' || status === 'in-progress';

  return (
    <div className='rounded-2xl border bg-card shadow-xs'>
      <div className='flex items-center justify-between gap-3 border-b px-5 py-3'>
        <div className='flex items-baseline gap-2'>
          <h2 className='text-sm font-medium'>Canvas</h2>
          {displayImages.length > 0 && !busy && (
            <span className='font-mono text-xs tabular-nums text-muted-foreground'>
              {displayImages.length}{' '}
              {displayImages.length === 1 ? 'image' : 'images'}
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className='rounded-b-2xl bg-background/60 p-4 sm:p-6'>
        {busy ? (
          <CanvasGenerating
            ratios={ratios}
            status={status as 'generating' | 'in-progress'}
          />
        ) : active ? (
          <div className='flex flex-col gap-5'>
            {/* Stage */}
            <div className='flex justify-center'>
              <img
                src={active.url}
                alt={`Generated image ${activeIndex + 1}`}
                className={cn(
                  'rounded-xl border bg-card object-contain shadow-sm',
                  active.aspectRatio === '9:16'
                    ? 'aspect-[9/16] h-[min(68vh,640px)] w-auto max-w-full'
                    : 'aspect-video w-full max-w-4xl',
                )}
              />
            </div>

            {/* Actions for the image on stage */}
            <div className='mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span className='flex items-center gap-2 text-xs text-muted-foreground'>
                <RatioGlyph ratio={active.aspectRatio} active />
                <span className='font-mono tabular-nums'>
                  v{activeIndex + 1} · {active.aspectRatio}
                </span>
              </span>
              <ImageActionButtons
                imageUrl={active.url}
                aspectRatio={active.aspectRatio}
                variant='toolbar'
              />
            </div>

            <div className='mx-auto flex w-full max-w-4xl flex-wrap gap-2 border-t pt-4'>
              {onCustomize && (
                <CustomizeButton
                  onClick={onCustomize}
                  hasMessages={hasChatMessages}
                />
              )}
              {onEdit && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onEdit(activeIndex)}
                  className='cursor-pointer'
                >
                  <ArrowUpRight className='size-4' />
                  Edit in Image to Image
                </Button>
              )}
              <Button
                type='button'
                variant='outline'
                onClick={handleDownloadAll}
                className='cursor-pointer sm:ml-auto'
              >
                <Download className='size-4' />
                Download all (ZIP)
              </Button>
            </div>

            {/* Version history */}
            {displayImages.length > 1 && (
              <div className='mx-auto w-full max-w-4xl'>
                <p className='mb-2 text-xs text-muted-foreground'>Versions</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {displayImages.map((img, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={`${img.url}-${idx}`}
                        type='button'
                        onClick={() => setSelected(idx)}
                        aria-label={`Show version ${idx + 1}`}
                        aria-pressed={isActive}
                        className={cn(
                          'relative shrink-0 overflow-hidden rounded-lg border-2 bg-card transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                          isActive
                            ? 'border-brand'
                            : 'border-transparent ring-1 ring-border hover:ring-foreground/20',
                        )}
                      >
                        <img
                          src={img.url}
                          alt=''
                          className={cn(
                            'object-cover',
                            img.aspectRatio === '9:16'
                              ? 'h-20 w-[45px]'
                              : 'h-20 w-[142px]',
                          )}
                        />
                        <span className='absolute bottom-1 right-1 rounded bg-card/90 px-1 font-mono text-[10px] leading-4 text-foreground'>
                          v{idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : renderCustomContent ? (
          renderCustomContent()
        ) : (
          <CanvasEmptyState ratios={ratios} {...empty} />
        )}
      </div>
    </div>
  );
};
