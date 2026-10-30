'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowUpRight, Download, Pin, PinOff, Shuffle, X } from 'lucide-react';
import type { UIMessage } from 'ai';
import { Button } from '../ui/button';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ImageActionButtons } from '../shared/ImageActionButtons';
import { downloadImagesAsZip, type ImageData } from '../shared/imageUtils';
import {
  CanvasEmptyCopy,
  EmptyFrames,
  GeneratingCopy,
  GeneratingFrames,
  Stage,
} from './CanvasStates';
import { ExportMenu } from './ExportMenu';
import { RefineDock } from './RefineDock';
import { RatioGlyph } from './AspectRatioPicker';
import { SHORTLIST_LIMIT, type PinnedImage } from '@/store/studioStore';
import { cn } from '@/lib/utils';

export type CanvasStatus = 'idle' | 'generating' | 'in-progress' | 'completed';

export interface CanvasRefine {
  onSend: (text: string) => void;
  onRetry: () => void;
  messages: UIMessage[];
  creditCost: number;
}

export interface CanvasProps {
  status: CanvasStatus;
  images: ImageData[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  /** Ratios selected in the composer; shape the empty and loading frames. */
  ratios: string[];
  outputFormat: string;
  empty: { title: string; description: string; steps?: string[] };
  isGenerating: boolean;
  /** The refine instruction being applied, while it runs. */
  refining: string | null;
  onVary?: () => void;
  onEdit?: (image: ImageData) => void;
  editLabel?: string;
  refine?: CanvasRefine;
  shortlist: PinnedImage[];
  onTogglePin: (image: ImageData) => void;
  /** Set when the canvas shows a generation loaded from history. */
  loadedFrom?: { label: string; onClear: () => void } | null;
}

const STATUS_LABEL: Record<CanvasStatus, string> = {
  idle: 'Ready',
  generating: 'Preparing',
  'in-progress': 'Rendering',
  completed: 'Done',
};

export const Canvas = ({
  status,
  images,
  selectedUrl,
  onSelect,
  ratios,
  outputFormat,
  empty,
  isGenerating,
  refining,
  onVary,
  onEdit,
  editLabel = 'Edit in Image to Image',
  refine,
  shortlist,
  onTogglePin,
  loadedFrom,
}: CanvasProps) => {
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit');

  const busy = status === 'generating' || status === 'in-progress';
  const activeIndex = Math.max(
    0,
    images.findIndex((img) => img.url === selectedUrl),
  );
  const active = images[activeIndex] ?? null;
  // A refinement keeps the image on stage; a fresh generation replaces it.
  const showResult = !!active && (!busy || !!refining);
  const pinned = !!active && shortlist.some((p) => p.url === active.url);
  const view = showResult ? 'result' : busy ? 'generating' : 'empty';

  // A result that replaces the loading frames wipes in; other changes fade.
  const reduceMotion = useReducedMotion();
  const previousView = useRef(view);
  const wipe = previousView.current === 'generating';
  useEffect(() => {
    previousView.current = view;
  }, [view]);

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    try {
      toast.loading('Preparing zip file...', { id: 'zip-download' });
      await downloadImagesAsZip(images, outputFormat, 'generated');
      toast.success('All images downloaded as zip!', { id: 'zip-download' });
    } catch {
      toast.error('Failed to create zip file. Please try again.', {
        id: 'zip-download',
      });
    }
  };

  return (
    <MotionConfig reducedMotion='user'>
      <div className='flex h-full min-h-0 flex-col bg-background'>
        {/* Canvas bar */}
        <div className='flex h-11 shrink-0 items-center justify-between gap-3 border-b bg-card px-4'>
          <div className='flex min-w-0 items-center gap-2 text-sm'>
            <h2 className='font-medium'>Canvas</h2>
            {showResult && active && (
              <span className='flex items-center gap-1.5 truncate text-xs tabular-nums text-muted-foreground'>
                <RatioGlyph ratio={active.aspectRatio} active />
                {images.length > 1
                  ? `${activeIndex + 1} of ${images.length}`
                  : active.aspectRatio}
              </span>
            )}
            {loadedFrom && (
              <span className='flex min-w-0 items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs text-muted-foreground'>
                <span className='truncate'>{loadedFrom.label}</span>
                <button
                  type='button'
                  onClick={loadedFrom.onClear}
                  aria-label='Clear loaded generation'
                  className='rounded p-0.5 hover:bg-card hover:text-foreground'
                >
                  <X className='size-3' />
                </button>
              </span>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            {showResult && (
              <ToggleGroup
                type='single'
                size='sm'
                value={zoom}
                onValueChange={(value) =>
                  value && setZoom(value as 'fit' | 'actual')
                }
                aria-label='Zoom'
                className='rounded-lg bg-secondary p-0.5'
              >
                <ToggleGroupItem
                  value='fit'
                  className='h-6 rounded-md px-2 text-xs data-[state=on]:bg-card data-[state=on]:shadow-xs'
                >
                  Fit
                </ToggleGroupItem>
                <ToggleGroupItem
                  value='actual'
                  className='h-6 rounded-md px-2 text-xs tabular-nums data-[state=on]:bg-card data-[state=on]:shadow-xs'
                >
                  100%
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  status === 'completed'
                    ? 'bg-emerald-500'
                    : busy
                      ? 'animate-pulse bg-brand'
                      : 'bg-muted-foreground/40',
                )}
              />
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        {/* Stage */}
        <Stage className='h-[min(62svh,520px)] shrink-0 p-4 sm:p-6 lg:h-auto lg:flex-1 lg:shrink'>
          <AnimatePresence mode='wait' initial={false}>
            <motion.div
              key={view}
              className='flex h-full w-full items-center justify-center'
              initial={
                view === 'result' && wipe && !reduceMotion
                  ? { clipPath: 'inset(0 100% 0 0)' }
                  : { opacity: 0 }
              }
              animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: view === 'result' && wipe ? 0.6 : 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {view === 'result' && active ? (
                zoom === 'fit' ? (
                  <AnimatePresence mode='popLayout' initial={false}>
                    <motion.img
                      key={active.url}
                      layout
                      src={active.url}
                      alt={`Generated image ${activeIndex + 1}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: refining ? 0.4 : 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className='max-h-full max-w-full rounded-lg border bg-card object-contain shadow-sm'
                    />
                  </AnimatePresence>
                ) : (
                  <div className='absolute inset-0 overflow-auto'>
                    <div className='grid min-h-full w-max min-w-full place-items-center p-6'>
                      <img
                        src={active.url}
                        alt={`Generated image ${activeIndex + 1} at full size`}
                        className={cn(
                          'max-w-none rounded-lg border bg-card',
                          refining && 'opacity-40',
                        )}
                      />
                    </div>
                  </div>
                )
              ) : view === 'generating' ? (
                <GeneratingFrames ratios={ratios} />
              ) : (
                <EmptyFrames ratios={ratios} />
              )}
            </motion.div>
          </AnimatePresence>

          {refining && busy && (
            <div className='absolute inset-x-4 bottom-4 rounded-xl border bg-card/95 p-3 shadow-sm sm:inset-x-auto sm:w-80'>
              <GeneratingCopy
                status={status}
                detail={`Applying “${refining}”`}
              />
            </div>
          )}
        </Stage>

        {busy && !refining && (
          <div className='shrink-0 px-4 pb-6'>
            <GeneratingCopy status={status} />
          </div>
        )}

        {!busy && !active && (
          <div className='shrink-0 px-4 pb-8'>
            <CanvasEmptyCopy {...empty} />
          </div>
        )}

        {showResult && active && (
          <>
            {/* Actions for the image on stage */}
            <div className='flex shrink-0 flex-wrap items-center gap-2 border-t bg-card px-4 py-2.5'>
              <Button
                type='button'
                variant={pinned ? 'secondary' : 'outline'}
                size='sm'
                aria-pressed={pinned}
                onClick={() => onTogglePin(active)}
                disabled={!pinned && shortlist.length >= SHORTLIST_LIMIT}
                title={
                  !pinned && shortlist.length >= SHORTLIST_LIMIT
                    ? `The compare set holds ${SHORTLIST_LIMIT}. Unpin one first.`
                    : undefined
                }
              >
                {pinned ? (
                  <PinOff className='size-4' />
                ) : (
                  <Pin className='size-4' />
                )}
                {pinned ? 'Unpin' : 'Pin to compare'}
              </Button>
              {onVary && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={onVary}
                      disabled={isGenerating}
                    >
                      <Shuffle className='size-4' />
                      Vary
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Same settings, a fresh render. Costs the same as Generate.
                  </TooltipContent>
                </Tooltip>
              )}
              {onEdit && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => onEdit(active)}
                >
                  <ArrowUpRight className='size-4' />
                  {editLabel}
                </Button>
              )}
              <span className='flex-1' />
              <ExportMenu image={active} />
              <ImageActionButtons
                imageUrl={active.url}
                aspectRatio={active.aspectRatio}
                variant='toolbar'
              />
              {images.length > 1 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleDownloadAll}
                >
                  <Download className='size-4' />
                  All (ZIP)
                </Button>
              )}
            </div>

            {/* Variations and versions */}
            {images.length > 1 && (
              <div className='shrink-0 border-t bg-card px-4 py-2.5'>
                <div
                  role='listbox'
                  aria-label='Versions'
                  className='flex gap-2 overflow-x-auto pb-1'
                >
                  {images.map((img, idx) => {
                    const isActive = idx === activeIndex;
                    const isPinned = shortlist.some((p) => p.url === img.url);
                    return (
                      <button
                        key={`${img.url}-${idx}`}
                        type='button'
                        role='option'
                        aria-selected={isActive}
                        aria-label={`Version ${idx + 1}${isPinned ? ', pinned' : ''}`}
                        onClick={() => onSelect(img.url)}
                        className={cn(
                          'relative shrink-0 overflow-hidden rounded-md border-2 bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                          isActive
                            ? 'border-brand'
                            : 'border-transparent ring-1 ring-border hover:ring-foreground/25',
                        )}
                      >
                        <img
                          src={img.url}
                          alt=''
                          loading='lazy'
                          className={cn(
                            'h-16 object-cover',
                            img.aspectRatio === '9:16' ? 'w-9' : 'w-28',
                          )}
                        />
                        <span className='absolute bottom-0.5 right-0.5 rounded bg-card/90 px-1 text-[10px] leading-4 tabular-nums'>
                          {idx + 1}
                        </span>
                        {isPinned && (
                          <span className='absolute left-0.5 top-0.5 flex size-4 items-center justify-center rounded bg-brand text-brand-foreground'>
                            <Pin className='size-2.5' />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {refine && (
              <RefineDock
                onSend={refine.onSend}
                onRetry={refine.onRetry}
                messages={refine.messages}
                busy={isGenerating}
                creditCost={refine.creditCost}
              />
            )}
          </>
        )}
      </div>
    </MotionConfig>
  );
};
