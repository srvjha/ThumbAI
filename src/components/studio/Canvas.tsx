'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowUpRight,
  Download,
  Eye,
  FileDown,
  MessageSquare,
  Pin,
  PinOff,
  Shuffle,
  X,
} from 'lucide-react';
import type { UIMessage } from 'ai';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  downloadImage,
  downloadImagesAsZip,
  type ImageData,
} from '../shared/imageUtils';
import {
  EmptyFrames,
  GeneratingCopy,
  GeneratingFrames,
  Stage,
} from './CanvasStates';
import { EXPORT_SIZES, exportImage } from './ExportMenu';
import { RefineDock } from './RefineDock';
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
  /** Example inputs shown on the empty canvas; picking one fills the composer. */
  suggestions?: string[];
  onSuggest?: (text: string) => void;
  isGenerating: boolean;
  /** The refine instruction being applied, while it runs. */
  refining: string | null;
  onVary?: () => void;
  onEdit?: (image: ImageData) => void;
  editLabel?: string;
  refine?: CanvasRefine;
  shortlist: PinnedImage[];
  onTogglePin: (image: ImageData) => void;
  onPreview: () => void;
  previewDisabledReason: string | null;
  /** Set when the canvas shows a generation loaded from history. */
  loadedFrom?: { label: string; onClear: () => void } | null;
}

/** An icon button in the floating image toolbar, with its tooltip. */
const ToolButton = ({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type='button'
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          'flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40',
          pressed && 'bg-accent text-accent-foreground hover:bg-accent',
        )}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export const Canvas = ({
  status,
  images,
  selectedUrl,
  onSelect,
  ratios,
  outputFormat,
  suggestions,
  onSuggest,
  isGenerating,
  refining,
  onVary,
  onEdit,
  editLabel = 'Edit in Image to Image',
  refine,
  shortlist,
  onTogglePin,
  onPreview,
  previewDisabledReason,
  loadedFrom,
}: CanvasProps) => {
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

  const handleDownload = async () => {
    if (!active) return;
    try {
      await downloadImage(
        active.url,
        `thumbai-${active.aspectRatio.replace(':', 'x')}.${outputFormat || 'jpg'}`,
      );
      toast.success('Image downloaded', { id: 'download' });
    } catch {
      toast.error('Download failed. Try again.', { id: 'download' });
    }
  };

  const handleDownloadAll = async () => {
    try {
      toast.loading('Preparing zip file…', { id: 'zip-download' });
      await downloadImagesAsZip(images, outputFormat, 'generated');
      toast.success('All images downloaded as zip', { id: 'zip-download' });
    } catch {
      toast.error('Failed to create the zip file. Try again.', {
        id: 'zip-download',
      });
    }
  };

  const handleCopyLink = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.url);
      toast.success('Image link copied');
    } catch {
      toast.error('Couldn’t copy the link');
    }
  };

  const pinBlocked = !pinned && shortlist.length >= SHORTLIST_LIMIT;

  return (
    <MotionConfig reducedMotion='user'>
      <section
        aria-label='Canvas'
        className={cn(
          'flex min-h-0 flex-col gap-4',
          view !== 'empty' && 'flex-1',
        )}
      >
        {loadedFrom && view === 'result' && (
          <div className='flex justify-center'>
            <span className='flex max-w-full items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-xs text-muted-foreground'>
              <span className='truncate'>From history: {loadedFrom.label}</span>
              <button
                type='button'
                onClick={loadedFrom.onClear}
                aria-label='Close this generation'
                className='rounded-full p-1 hover:bg-card hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
              >
                <X className='size-3' />
              </button>
            </span>
          </div>
        )}

        <Stage
          className={
            view === 'empty'
              ? 'h-[clamp(180px,30svh,340px)]'
              : 'min-h-[clamp(260px,50svh,640px)] flex-1'
          }
        >
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
                <div className='group relative'>
                  <AnimatePresence mode='popLayout' initial={false}>
                    <motion.img
                      key={active.url}
                      layout
                      src={active.url}
                      alt={`Result ${activeIndex + 1}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: refining ? 0.4 : 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 34,
                      }}
                      className='block max-h-[100cqh] max-w-[100cqw] rounded-xl bg-card object-contain shadow-[0_1px_2px_rgb(18_23_43/0.06),0_16px_40px_-16px_rgb(18_23_43/0.25)]'
                    />
                  </AnimatePresence>

                  {/* Floating toolbar: on hover or focus, always on touch. */}
                  {!busy && (
                    <div
                      role='toolbar'
                      aria-label='Image actions'
                      className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border bg-card p-1 shadow-lg transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100'
                    >
                      {onVary && (
                        <ToolButton
                          label='Vary: same settings, new render'
                          onClick={onVary}
                          disabled={isGenerating}
                        >
                          <Shuffle className='size-4' />
                        </ToolButton>
                      )}
                      {refine && (
                        <ToolButton
                          label='Refine with words'
                          onClick={() =>
                            document.getElementById('refine-input')?.focus()
                          }
                        >
                          <MessageSquare className='size-4' />
                        </ToolButton>
                      )}
                      <ToolButton
                        label={
                          pinBlocked
                            ? `Compare set is full (${SHORTLIST_LIMIT})`
                            : pinned
                              ? 'Unpin from compare'
                              : 'Pin to compare'
                        }
                        onClick={() => onTogglePin(active)}
                        disabled={pinBlocked}
                        pressed={pinned}
                      >
                        {pinned ? (
                          <PinOff className='size-4' />
                        ) : (
                          <Pin className='size-4' />
                        )}
                      </ToolButton>
                      <ToolButton
                        label={previewDisabledReason ?? 'Preview in feed'}
                        onClick={onPreview}
                        disabled={!!previewDisabledReason}
                      >
                        <Eye className='size-4' />
                      </ToolButton>
                      {onEdit && (
                        <ToolButton
                          label={editLabel}
                          onClick={() => onEdit(active)}
                        >
                          <ArrowUpRight className='size-4' />
                        </ToolButton>
                      )}
                      <span className='mx-0.5 h-5 w-px bg-border' aria-hidden />
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button
                                type='button'
                                aria-label='Export or download'
                                className='flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                              >
                                <Download className='size-4' />
                                Download
                              </button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            Download or export a size
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align='end' className='w-64'>
                          <DropdownMenuItem onSelect={handleDownload}>
                            <Download />
                            Original
                            <span className='ml-auto text-xs uppercase text-muted-foreground'>
                              {outputFormat}
                            </span>
                          </DropdownMenuItem>
                          {images.length > 1 && (
                            <DropdownMenuItem onSelect={handleDownloadAll}>
                              <Download />
                              All {images.length} as ZIP
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={handleCopyLink}>
                            <ArrowUpRight />
                            Copy image link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className='text-xs font-normal text-muted-foreground'>
                            Export a size (JPEG, cropped to fill)
                          </DropdownMenuLabel>
                          {EXPORT_SIZES.map((size) => (
                            <DropdownMenuItem
                              key={size.id}
                              onSelect={() => exportImage(active, size)}
                            >
                              <FileDown />
                              {size.label}
                              <span className='ml-auto text-xs tabular-nums text-muted-foreground'>
                                {size.w}×{size.h}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {refining && busy && (
                    <div className='absolute inset-x-4 top-1/2 mx-auto max-w-xs -translate-y-1/2 rounded-xl border bg-card p-3 shadow-lg'>
                      <GeneratingCopy
                        status={status}
                        detail={`Applying “${refining}”`}
                      />
                    </div>
                  )}
                </div>
              ) : view === 'generating' ? (
                <GeneratingFrames ratios={ratios} />
              ) : (
                <EmptyFrames ratios={ratios} />
              )}
            </motion.div>
          </AnimatePresence>
        </Stage>

        {busy && view === 'generating' && <GeneratingCopy status={status} />}

        {view === 'empty' && (
          <div className='flex flex-col items-center gap-3 pb-2 text-center'>
            <p className='text-sm text-muted-foreground'>
              Your thumbnail appears here
            </p>
            {suggestions && onSuggest && (
              <div className='flex max-w-2xl flex-wrap justify-center gap-2'>
                {suggestions.map((text) => (
                  <button
                    key={text}
                    type='button'
                    onClick={() => onSuggest(text)}
                    className='max-w-full truncate rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brand hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'result' && images.length > 1 && (
          <div
            role='listbox'
            aria-label='Versions'
            className='flex justify-center gap-2 overflow-x-auto px-1 pb-1'
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
                    'relative shrink-0 overflow-hidden rounded-lg bg-secondary outline-offset-2 transition-[opacity,outline-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    isActive
                      ? 'outline-2 outline-brand'
                      : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <img
                    src={img.url}
                    alt=''
                    loading='lazy'
                    width={img.aspectRatio === '9:16' ? 32 : 100}
                    height={56}
                    className={cn(
                      'h-14 object-cover',
                      img.aspectRatio === '9:16' ? 'w-8' : 'w-[100px]',
                    )}
                  />
                  {isPinned && (
                    <span className='absolute left-1 top-1 flex size-4 items-center justify-center rounded bg-brand text-brand-foreground'>
                      <Pin className='size-2.5' />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {view === 'result' && refine && (
          <div className='mx-auto w-full max-w-[880px]'>
            <RefineDock
              onSend={refine.onSend}
              onRetry={refine.onRetry}
              messages={refine.messages}
              busy={isGenerating}
              creditCost={refine.creditCost}
            />
          </div>
        )}
      </section>
    </MotionConfig>
  );
};
