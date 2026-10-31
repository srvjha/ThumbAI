'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowUp,
  Check,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share,
  TriangleAlert,
  X,
  CircleSlash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadImage, type ImageData } from '@/components/shared/imageUtils';
import { EXPORT_SIZES, exportImage } from '../ExportMenu';
import { AutoTextarea } from '../controls';
import { cn } from '@/lib/utils';
import {
  MS_PER_CHAR,
  TurnActions,
  TypedText,
  WorkedFor,
} from './AssistantText';
import { RenderingCard } from './RenderingCard';
import { frameClass } from './frame';
import type { Turn } from './types';

type GenerationTurn = Extract<Turn, { role: 'generation' }>;

const QUICK_EDITS = [
  'Make the title bigger',
  'Boost the contrast',
  'Simplify the background',
  'Remove the text',
];

/** PNG on the clipboard where the browser allows it; the link otherwise. */
const copyImage = async (url: string) => {
  try {
    const blob = await fetch(url).then((r) => r.blob());
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/png'),
    );
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    toast.success('Image copied');
  } catch {
    await navigator.clipboard.writeText(url);
    toast.success('Image link copied');
  }
};

const shareImage = async (url: string) => {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Thumbnail from ThumbAI', url });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  await navigator.clipboard.writeText(url);
  toast.success('Link copied to share');
};

const download = async (image: ImageData, format: string) => {
  try {
    await downloadImage(
      image.url,
      `thumbai-${image.aspectRatio.replace(':', 'x')}.${format === 'jpeg' ? 'jpg' : format}`,
    );
  } catch {
    toast.error('Download failed. Try again.');
  }
};

const ActionButton = ({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        aria-label={label}
        onClick={onClick}
        className={cn(
          'size-8 text-muted-foreground hover:text-foreground',
          active && 'bg-accent text-accent-foreground',
        )}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

/** The change to make, typed right under the image it applies to. */
const InlineEdit = ({
  onSend,
  onClose,
  disabled,
}: {
  onSend: (text: string) => void;
  onClose: () => void;
  disabled: boolean;
}) => {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const submit = (value = text) => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className='overflow-hidden'
    >
      <div className='mt-2 max-w-[34rem] rounded-2xl border bg-card p-2 shadow-xs'>
        <div className='flex items-end gap-2'>
          <AutoTextarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label='Describe the change'
            placeholder='What should change in this image?'
            className='px-2 py-1.5 text-sm'
          />
          <Button
            type='button'
            size='icon'
            variant='brand'
            aria-label='Apply edit'
            disabled={!text.trim() || disabled}
            onClick={() => submit()}
            className='size-8 shrink-0 rounded-full'
          >
            <ArrowUp className='size-4' />
          </Button>
        </div>
        <div className='mt-1.5 flex flex-wrap gap-1.5 px-1 pb-0.5'>
          {QUICK_EDITS.map((q) => (
            <button
              key={q}
              type='button'
              disabled={disabled}
              onClick={() => submit(q)}
              className='rounded-full border bg-background px-2.5 py-1 text-xs transition-colors hover:border-brand hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ImageResult = ({
  image,
  format,
  busy,
  isTarget,
  onEdit,
  onVary,
  onPreview,
  onOpen,
}: {
  image: ImageData;
  format: string;
  busy: boolean;
  isTarget: boolean;
  onEdit: (text: string) => void;
  onVary: () => void;
  onPreview?: () => void;
  onOpen: () => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className='min-w-0'>
      <button
        type='button'
        onClick={onOpen}
        aria-label='Open full size'
        className={cn(
          'group relative block overflow-hidden rounded-2xl bg-secondary outline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          frameClass(image.aspectRatio),
          (editing || isTarget) &&
            'ring-2 ring-brand ring-offset-2 ring-offset-background',
        )}
      >
        <img
          src={image.url}
          alt='Generated thumbnail'
          className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]'
        />
      </button>

      <div className='mt-1.5 flex items-center gap-0.5'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className={cn(
            'h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground',
            editing && 'bg-accent text-accent-foreground',
          )}
        >
          <Pencil className='size-3.5' />
          Edit
        </Button>
        <ActionButton
          label={copied ? 'Copied' : 'Copy'}
          onClick={async () => {
            await copyImage(image.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
        </ActionButton>
        <ActionButton label='Share' onClick={() => shareImage(image.url)}>
          <Share className='size-4' />
        </ActionButton>
        <ActionButton label='Download' onClick={() => download(image, format)}>
          <Download className='size-4' />
        </ActionButton>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='More'
                  className='size-8 text-muted-foreground hover:text-foreground'
                >
                  <MoreHorizontal className='size-4' />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align='start' className='w-56'>
            <DropdownMenuItem disabled={busy} onSelect={onVary}>
              <RefreshCw /> Try another version
            </DropdownMenuItem>
            {onPreview && (
              <DropdownMenuItem onSelect={onPreview}>
                <Eye /> Preview in a YouTube feed
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download /> Export size
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {EXPORT_SIZES.map((size) => (
                  <DropdownMenuItem
                    key={size.id}
                    onSelect={() => exportImage(image, size)}
                  >
                    {size.label}
                    <span className='ml-auto text-xs tabular-nums text-muted-foreground'>
                      {size.w}×{size.h}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <InlineEdit
            disabled={busy}
            onClose={() => setEditing(false)}
            onSend={(text) => {
              setEditing(false);
              onEdit(text);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/** What to say once the images land, pointing at a next step. */
const followUp = (turn: GenerationTurn, kind: 'youtube' | 'blog') => {
  if (turn.request.target) return 'Done. Want to change anything else?';
  const n = turn.images.length;
  if (n > 1) {
    return `Here are your ${n} images. Pick one to edit, or ask for a different headline.`;
  }
  if (kind === 'blog') {
    return 'Here’s your cover. Want a different headline or a bolder background?';
  }
  return turn.images[0]?.aspectRatio === '9:16'
    ? 'Here’s your Shorts cover. Want a 16:9 version or a different headline?'
    : 'Here’s your thumbnail. Want a vertical version for Shorts or a different headline?';
};

/**
 * One image turn, laid out like an assistant reply: how long it worked, the
 * frame (rendering, then the results), its note on the design typed out
 * beneath, and actions for the turn.
 */
export const ImageTurn = ({
  turn,
  kind,
  busy,
  target,
  onEdit,
  onVary,
  onPreview,
  onCancel,
  onRate,
}: {
  turn: GenerationTurn;
  kind: 'youtube' | 'blog';
  busy: boolean;
  target: ImageData | null;
  onEdit: (image: ImageData, text: string) => void;
  onVary: () => void;
  onPreview: (image: ImageData) => void;
  onCancel: () => Promise<void>;
  onRate: (value: 'up' | 'down') => void;
}) => {
  const [open, setOpen] = useState<ImageData | null>(null);
  const { phase, ratios, images, error, startedAt, writingMs, reply } = turn;
  const format = turn.request.settings.outputFormat;
  const pending = phase === 'writing' || phase === 'rendering';
  const replyAt = startedAt + (writingMs ?? 0);

  const details = [
    turn.request.target ? { label: 'Task', value: 'Edit the selected image' } : null,
    turn.archetype ? { label: 'Design', value: turn.archetype } : null,
    turn.headline ? { label: 'Headline', value: `“${turn.headline}”` } : null,
    { label: 'Format', value: ratios.join(' + ') },
    turn.modelName ? { label: 'Model', value: turn.modelName } : null,
  ].filter((d): d is { label: string; value: string } => d !== null);

  const header = (
    <WorkedFor
      thinking={phase === 'writing'}
      startedAt={startedAt}
      writingMs={writingMs}
      details={details}
    />
  );

  const note = reply ? (
    <TypedText text={reply} since={replyAt} className='mt-3' />
  ) : null;

  if (pending) {
    return (
      <div>
        {header}
        <RenderingCard
          ratios={ratios}
          startedAt={startedAt}
          modelName={turn.modelName}
          onCancel={onCancel}
        />
        {note}
      </div>
    );
  }

  if (phase === 'cancelled') {
    return (
      <div>
        {header}
        <div className='flex flex-wrap items-center gap-3 rounded-2xl border bg-card/60 px-4 py-3 text-sm text-muted-foreground'>
          <CircleSlash className='size-4 shrink-0' />
          <p className='min-w-0 flex-1'>Cancelled · credits refunded</p>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={busy}
            onClick={onVary}
          >
            <RefreshCw className='size-3.5' /> Run again
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className='flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm'>
        <TriangleAlert className='size-4 shrink-0 text-destructive' />
        <p className='min-w-0 flex-1'>
          {error || 'That one didn’t work.'}{' '}
          <span className='text-muted-foreground'>
            Any credits it took were refunded.
          </span>
        </p>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy}
          onClick={onVary}
        >
          <RefreshCw className='size-3.5' /> Retry
        </Button>
      </div>
    );
  }

  const finishedAt = turn.finishedAt ?? startedAt;
  const closing = followUp(turn, kind);

  return (
    <div>
      {header}
      <div
        className={cn(
          'grid gap-x-3 gap-y-4',
          images.length > 1 && 'sm:grid-cols-2',
        )}
      >
        {images.map((image) => (
          <ImageResult
            key={image.url}
            image={image}
            format={format}
            busy={busy}
            isTarget={target?.url === image.url}
            onEdit={(text) => onEdit(image, text)}
            onVary={onVary}
            onPreview={
              image.aspectRatio === '9:16' ? undefined : () => onPreview(image)
            }
            onOpen={() => setOpen(image)}
          />
        ))}
      </div>

      {note}
      {/* Only fresh turns have a reply; past ones opened from history don't. */}
      {writingMs !== undefined && (
        <TypedText
          text={closing}
          since={Math.max(finishedAt, replyAt + (reply?.length ?? 0) * MS_PER_CHAR)}
          className='mt-3'
        />
      )}
      <TurnActions
        text={[reply, writingMs !== undefined ? closing : null]
          .filter(Boolean)
          .join('\n\n')}
        at={finishedAt}
        feedback={turn.feedback}
        onRate={onRate}
      />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent
          showCloseButton={false}
          className='w-auto max-w-[min(92vw,1280px)] border-0 bg-transparent p-0 shadow-none sm:max-w-[min(92vw,1280px)]'
        >
          <DialogTitle className='sr-only'>Full-size image</DialogTitle>
          {open && (
            <img
              src={open.url}
              alt='Generated thumbnail, full size'
              className='max-h-[88svh] w-auto rounded-xl'
            />
          )}
          <Button
            type='button'
            size='icon'
            variant='secondary'
            aria-label='Close'
            onClick={() => setOpen(null)}
            className='absolute -top-3 -right-3 size-8 rounded-full'
          >
            <X className='size-4' />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
