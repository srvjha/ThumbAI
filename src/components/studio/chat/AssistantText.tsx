'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Check, ChevronRight, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Typing speed for replies. */
export const MS_PER_CHAR = 14;

const useNow = (running: boolean, every: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [running, every]);
  return now;
};

const seconds = (ms: number) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`;

/**
 * "Thinking… 3.2s" while the prompt is written, then a collapsible
 * "Worked for 8.5s" with what was decided.
 */
export const WorkedFor = ({
  thinking,
  startedAt,
  writingMs,
  details,
}: {
  thinking: boolean;
  startedAt: number;
  writingMs?: number;
  details: { label: string; value: string }[];
}) => {
  const now = useNow(thinking, 100);
  const [open, setOpen] = useState(false);

  if (thinking) {
    return (
      <p className='mb-3 text-sm' role='status' aria-live='polite'>
        <span className='shimmer-text font-medium'>Thinking…</span>{' '}
        <span className='text-xs tabular-nums text-muted-foreground'>
          {seconds(now - startedAt)}
        </span>
      </p>
    );
  }
  if (writingMs === undefined) return null;

  return (
    <div className='mb-3'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={details.length === 0}
        className='flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:hover:text-muted-foreground'
      >
        Worked for <span className='tabular-nums'>{seconds(writingMs)}</span>
        {details.length > 0 && (
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-90',
            )}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dl
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='overflow-hidden'
          >
            <div className='mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-l-2 pl-3 text-[13px]'>
              {details.map((d) => (
                <div key={d.label} className='contents'>
                  <dt className='text-muted-foreground'>{d.label}</dt>
                  <dd className='min-w-0 break-words'>{d.value}</dd>
                </div>
              ))}
            </div>
          </motion.dl>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Text that types itself out from `since`. Progress comes from the clock,
 * not from mount, so scrolling an old turn back into view or re-rendering
 * never replays it.
 */
export const TypedText = ({
  text,
  since,
  className,
}: {
  text: string;
  since: number;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  const total = text.length * MS_PER_CHAR;
  const typing = !reduce && Date.now() - since < total;
  const now = useNow(typing, 30);
  const shown = typing
    ? Math.min(text.length, Math.floor((now - since) / MS_PER_CHAR))
    : text.length;

  return (
    <p className={cn('text-[15px] leading-relaxed text-pretty', className)}>
      {/* Screen readers get the whole reply once, not each keystroke. */}
      <span className='sr-only'>{text}</span>
      <span aria-hidden>{text.slice(0, shown)}</span>
    </p>
  );
};

const relative = (at: number, now: number) => {
  const s = Math.floor((now - at) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
};

const IconAction = ({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'size-7 text-muted-foreground hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

/** Copy the reply, rate the turn, and when it happened. */
export const TurnActions = ({
  text,
  at,
  feedback,
  onRate,
}: {
  text: string;
  at: number;
  feedback?: 'up' | 'down' | null;
  onRate: (value: 'up' | 'down') => void;
}) => {
  const now = useNow(true, 30_000);
  const [copied, setCopied] = useState(false);

  return (
    <div className='-ml-1.5 mt-2 flex items-center gap-0.5'>
      {text && (
        <IconAction
          label={copied ? 'Copied' : 'Copy reply'}
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? (
            <Check className='size-3.5' />
          ) : (
            <Copy className='size-3.5' />
          )}
        </IconAction>
      )}
      <IconAction
        label='Good result'
        active={feedback === 'up'}
        onClick={() => {
          if (feedback !== 'up') toast.success('Thanks for the feedback');
          onRate('up');
        }}
      >
        <ThumbsUp
          className={cn('size-3.5', feedback === 'up' && 'fill-current')}
        />
      </IconAction>
      <IconAction
        label='Bad result'
        active={feedback === 'down'}
        onClick={() => {
          if (feedback !== 'down') toast('Thanks. Try an edit to fix it.');
          onRate('down');
        }}
      >
        <ThumbsDown
          className={cn('size-3.5', feedback === 'down' && 'fill-current')}
        />
      </IconAction>
      <span className='ml-1.5 text-xs text-muted-foreground'>
        {relative(at, now)}
      </span>
    </div>
  );
};
