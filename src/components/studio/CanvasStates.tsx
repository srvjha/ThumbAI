'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RATIO_OPTIONS, RatioGlyph } from './AspectRatioPicker';

const ratioValue = (ratio: string) => (ratio === '9:16' ? 9 / 16 : 16 / 9);

/**
 * A size container for the canvas stage. Frames inside it are sized with
 * container units so they fit both its width and its height.
 */
export const Stage = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cn(
      'relative flex min-h-0 items-center justify-center [container-type:size]',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * One frame per aspect ratio, as large as the stage allows. With two ratios
 * the frames share a height: h = min(stage height, (width - gap) / Σratios).
 */
export const CanvasFrames = ({
  ratios,
  children,
  maxWidth = 720,
}: {
  ratios: string[];
  children: (ratio: string) => ReactNode;
  /** Cap on the row's total width, in px. */
  maxWidth?: number;
}) => {
  const list = ratios.length > 0 ? ratios : ['16:9'];
  const sum = list.reduce((total, r) => total + ratioValue(r), 0);
  const gap = list.length > 1 ? '1rem' : '0px';
  const height = `min(100cqh, calc((min(100cqw, ${maxWidth}px) - ${gap}) / ${sum.toFixed(4)}))`;

  return (
    <div className='flex items-center gap-4'>
      {list.map((ratio) => (
        <div
          key={ratio}
          className='relative'
          style={
            {
              height,
              aspectRatio: ratio === '9:16' ? '9 / 16' : '16 / 9',
            } as CSSProperties
          }
        >
          {children(ratio)}
        </div>
      ))}
    </div>
  );
};

const ratioDetail = (ratio: string) =>
  RATIO_OPTIONS.find((o) => o.value === ratio)?.detail ?? ratio;

/** Dashed outline frames that show the shape the result will take. */
export const EmptyFrames = ({ ratios }: { ratios: string[] }) => (
  <CanvasFrames ratios={ratios}>
    {(ratio) => (
      <div className='absolute inset-0 flex items-end justify-start rounded-xl border border-dashed border-foreground/15 bg-card/50 p-3'>
        <span className='flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground'>
          <RatioGlyph ratio={ratio} />
          {ratioDetail(ratio)}
        </span>
      </div>
    )}
  </CanvasFrames>
);

/** Shaped skeleton in the ratio being rendered. */
export const GeneratingFrames = ({ ratios }: { ratios: string[] }) => (
  <CanvasFrames ratios={ratios}>
    {() => (
      <div className='absolute inset-0 overflow-hidden rounded-xl border bg-accent'>
        <div className='absolute inset-0 animate-pulse bg-brand-muted motion-reduce:animate-none' />
        <div className='absolute left-[7%] top-[12%] h-[14%] w-[46%] rounded-md bg-card/70' />
        <div className='absolute left-[7%] top-[30%] h-[8%] w-[30%] rounded-md bg-card/50' />
        <div className='absolute bottom-0 right-[8%] h-[62%] w-[34%] rounded-t-full bg-card/40' />
      </div>
    )}
  </CanvasFrames>
);

/** Honest progress copy: elapsed time and a bar that never claims done. */
export const GeneratingCopy = ({
  status,
  detail,
}: {
  status: 'generating' | 'in-progress';
  /** Overrides the second line, e.g. the refine instruction being applied. */
  detail?: string;
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);

  // Eases toward 92%; the real signal is the result arriving.
  const progress = Math.min(92, 100 * (1 - Math.exp(-elapsed / 25)));

  return (
    <div className='mx-auto w-full max-w-sm text-center' aria-live='polite'>
      <p className='text-sm font-medium'>
        {status === 'generating'
          ? 'Writing the design brief…'
          : 'Rendering your image…'}
      </p>
      <p className='mt-1 text-xs text-muted-foreground'>
        {detail ??
          (status === 'generating'
            ? 'Turning your input into a layout, type and colour plan.'
            : 'The model is drawing it now. This usually takes under a minute.')}
      </p>
      <div
        className='mt-3 h-1 overflow-hidden rounded-full bg-secondary'
        role='progressbar'
        aria-label='Generation progress'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className='h-full rounded-full bg-brand transition-[width] duration-1000 ease-out'
          style={{ width: `${Math.max(6, progress)}%` }}
        />
      </div>
      <p className='mt-1.5 text-[11px] tabular-nums text-muted-foreground'>
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
      </p>
    </div>
  );
};
