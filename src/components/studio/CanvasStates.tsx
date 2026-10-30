'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RATIO_OPTIONS, RatioGlyph } from './AspectRatioPicker';

const ratioValue = (ratio: string) => (ratio === '9:16' ? 9 / 16 : 16 / 9);

/**
 * Lays out one frame per aspect ratio. With both ratios the frames share a
 * height: flex-grow proportional to width/height does that without measuring.
 */
const CanvasFrames = ({
  ratios,
  children,
}: {
  ratios: string[];
  children: (ratio: string) => ReactNode;
}) => {
  const list = ratios.length > 0 ? ratios : ['16:9'];

  if (list.length === 1) {
    const portrait = list[0] === '9:16';
    return (
      <div className='flex justify-center'>
        <div
          className={cn(
            'relative',
            portrait
              ? 'aspect-[9/16] h-[min(60vh,520px)]'
              : 'aspect-video w-full max-w-3xl',
          )}
        >
          {children(list[0])}
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl items-start gap-4'>
      {list.map((ratio) => (
        <div
          key={ratio}
          className='relative'
          style={{
            flex: `${ratioValue(ratio)} 1 0`,
            aspectRatio: ratio === '9:16' ? '9 / 16' : '16 / 9',
          }}
        >
          {children(ratio)}
        </div>
      ))}
    </div>
  );
};

const ratioDetail = (ratio: string) =>
  RATIO_OPTIONS.find((o) => o.value === ratio)?.detail ?? ratio;

/** What the canvas shows before anything has been generated. */
export const CanvasEmptyState = ({
  ratios,
  title,
  description,
  steps,
}: {
  ratios: string[];
  title: string;
  description: string;
  steps?: string[];
}) => (
  <div className='flex flex-col gap-8 py-4'>
    <CanvasFrames ratios={ratios}>
      {(ratio) => (
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/15 bg-card/60'>
          <RatioGlyph ratio={ratio} active />
          <span className='font-mono text-[11px] tabular-nums text-muted-foreground'>
            {ratioDetail(ratio)}
          </span>
        </div>
      )}
    </CanvasFrames>
    <div className='mx-auto max-w-md text-center'>
      <h2 className='font-serif text-2xl tracking-tight'>{title}</h2>
      <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
      {steps && steps.length > 0 && (
        <ol className='mt-5 grid gap-2 text-left text-sm sm:grid-cols-3 sm:gap-3'>
          {steps.map((step, i) => (
            <li
              key={step}
              className='flex gap-2 rounded-lg border bg-card px-3 py-2 sm:flex-col sm:gap-1'
            >
              <span className='font-mono text-xs tabular-nums text-brand'>
                0{i + 1}
              </span>
              <span className='text-xs text-muted-foreground'>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  </div>
);

/** Shaped skeleton in the ratio being rendered, with honest progress copy. */
export const CanvasGenerating = ({
  ratios,
  status,
}: {
  ratios: string[];
  status: 'generating' | 'in-progress';
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

  // Eases toward 92% and never claims to be done; the real signal is the
  // result arriving.
  const progress = Math.min(92, 100 * (1 - Math.exp(-elapsed / 25)));

  return (
    <div className='flex flex-col gap-8 py-4' aria-live='polite'>
      <CanvasFrames ratios={ratios}>
        {() => (
          <div className='absolute inset-0 overflow-hidden rounded-xl border bg-accent'>
            <div className='absolute inset-0 animate-pulse bg-brand-muted' />
            <div className='absolute left-[7%] top-[12%] h-[14%] w-[46%] rounded-md bg-card/70' />
            <div className='absolute left-[7%] top-[30%] h-[8%] w-[30%] rounded-md bg-card/50' />
            <div className='absolute bottom-0 right-[8%] h-[62%] w-[34%] rounded-t-full bg-card/40' />
          </div>
        )}
      </CanvasFrames>
      <div className='mx-auto w-full max-w-sm text-center'>
        <p className='text-sm font-medium'>
          {status === 'generating'
            ? 'Writing the design brief…'
            : 'Rendering your image…'}
        </p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {status === 'generating'
            ? 'Turning your input into a layout, type and colour plan.'
            : 'The model is drawing it now. This usually takes under a minute.'}
        </p>
        <div className='mt-4 h-1 overflow-hidden rounded-full bg-secondary'>
          <div
            className='h-full rounded-full bg-brand transition-[width] duration-1000 ease-out'
            style={{ width: `${Math.max(6, progress)}%` }}
          />
        </div>
        <p className='mt-2 font-mono text-[11px] tabular-nums text-muted-foreground'>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
};
