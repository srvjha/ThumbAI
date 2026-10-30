'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { animate, m, useInView, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/motion/CountUp';
import { LayoutMotion } from '@/components/motion/MotionRoot';
import { EASE, SPRING } from '@/components/motion/tokens';
import {
  usePageVisible,
  usePrefersReducedMotion,
} from '@/components/motion/hooks';
import { SAMPLES } from './samples';

// The widths a thumbnail is actually seen at, each with its own render.
const STEPS = [
  {
    label: 'Full size',
    width: null,
    px: 1280,
    sample: SAMPLES.fitness,
    title: 'I ran at 5am for 30 days',
    channel: 'Tempo Club',
  },
  {
    label: 'Desktop feed',
    width: 320,
    px: 320,
    sample: SAMPLES.gaming,
    title: 'Day 100 in the frozen north',
    channel: 'Northbound',
  },
  {
    label: 'Phone feed',
    width: 168,
    px: 168,
    sample: SAMPLES.cooking,
    title: '10 minute ramen, upgraded',
    channel: 'Small Kitchen',
  },
] as const;

type Step = (typeof STEPS)[number];

const STEP_MS = 3000;

const boxWidth = (s: Step) => (s.width ? `${s.width}px` : '100%');
const captionSize = (s: Step) => (s.width === 168 ? 'text-[11px]' : 'text-sm');

const Caption = ({ step }: { step: Step }) => (
  <>
    <span className='block font-medium'>{step.title}</span>
    <span className='text-muted-foreground'>
      {step.channel} &middot; 2 days ago
    </span>
  </>
);

/**
 * A slideshow of real renders, each shrunk to the size a feed shows it at.
 * Auto-advances while on screen; hover or focus pauses it, a click jumps.
 */
export const FeedSizePreview = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const visible = usePageVisible();
  const reduce = usePrefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // `run` changes on every advance, so clicking the active step still restarts.
  const [pos, setPos] = useState({ index: 0, prev: 0, run: 0 });
  // 0 to 1 through the current step; drives the active bar and survives pauses.
  const progress = useMotionValue(0);

  const playing = inView && visible && !reduce && !hovered && !focused;

  const go = (index: number) => {
    progress.set(0);
    setPos((p) => ({ index, prev: p.index, run: p.run + 1 }));
  };

  useEffect(() => {
    if (!playing) return;
    const controls = animate(progress, 1, {
      duration: ((1 - progress.get()) * STEP_MS) / 1000,
      ease: 'linear',
      onComplete: () => {
        progress.set(0);
        setPos((p) => ({
          index: (p.index + 1) % STEPS.length,
          prev: p.index,
          run: p.run + 1,
        }));
      },
    });
    return () => controls.stop();
  }, [playing, pos.run, progress]);

  const step = STEPS[pos.index];
  const prev = STEPS[pos.prev];

  return (
    <LayoutMotion>
      <div
        ref={ref}
        className='rounded-2xl bg-card p-4 sm:p-6'
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
      >
        <div className='grid grid-cols-3 gap-2 sm:gap-3'>
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type='button'
              aria-pressed={i === pos.index}
              onClick={() => go(i)}
              className={cn(
                'flex flex-col justify-between rounded-sm pb-1 text-left text-sm transition-colors',
                i === pos.index
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>
                {s.label}
                {s.width && (
                  <span className='hidden font-normal text-muted-foreground sm:inline'>
                    {' '}
                    {s.width}px
                  </span>
                )}
              </span>
              {/* Story-style progress: done steps full, the active one filling;
                the bars sit on one baseline even when a label wraps. */}
              <span className='mt-2 block h-0.5 overflow-hidden rounded-full bg-foreground/10'>
                <m.span
                  className='block h-full origin-left bg-brand'
                  style={{
                    scaleX:
                      i === pos.index
                        ? reduce
                          ? 1
                          : progress
                        : i < pos.index
                          ? 1
                          : 0,
                  }}
                />
              </span>
            </button>
          ))}
        </div>

        <div className='mt-4 grid aspect-[16/10] grid-cols-1 place-items-center overflow-hidden rounded-lg bg-background p-4'>
          {/* The size it just left, fading out behind the new one. */}
          {pos.prev !== pos.index && (
            <m.div
              key={pos.run}
              aria-hidden
              className='col-start-1 row-start-1 max-w-full'
              style={{ width: boxWidth(prev) }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
            >
              <div className='aspect-video rounded-md border border-dashed border-foreground/25' />
              <div
                className={cn('invisible pt-2 leading-snug', captionSize(prev))}
              >
                <Caption step={prev} />
              </div>
            </m.div>
          )}

          {/* The size change springs; layout animation scales the box with
            transforms, so nothing reflows mid-flight. */}
          <m.figure
            layout
            transition={SPRING}
            className='col-start-1 row-start-1 max-w-full'
            style={{ width: boxWidth(step) }}
          >
            <div className='relative aspect-video overflow-hidden rounded-md bg-muted'>
              {STEPS.map((s, i) => (
                <m.div
                  key={s.sample.src}
                  className='absolute inset-0'
                  initial={false}
                  animate={{
                    opacity: i === pos.index ? 1 : 0,
                    scale: i === pos.index ? 1 : 1.06,
                  }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <Image
                    src={s.sample.src}
                    alt={i === pos.index ? s.sample.alt : ''}
                    fill
                    sizes='(min-width: 1024px) 560px, 100vw'
                    className='object-cover'
                  />
                </m.div>
              ))}
            </div>
            <m.figcaption
              key={pos.index}
              layout='position'
              transition={SPRING}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn('pt-2 leading-snug', captionSize(step))}
            >
              <Caption step={step} />
            </m.figcaption>
          </m.figure>
        </div>

        <p className='mt-4 flex items-baseline gap-2 text-sm text-muted-foreground'>
          <CountUp
            from={prev.px}
            to={step.px}
            duration={0.9}
            suffix=' px'
            className='font-serif text-2xl text-foreground'
          />
          wide
        </p>
      </div>
    </LayoutMotion>
  );
};
