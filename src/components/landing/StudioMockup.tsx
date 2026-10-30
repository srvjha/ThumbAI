'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, m } from 'framer-motion';
import { FileText, ImagePlus, LayoutGrid, Type, Download } from 'lucide-react';
import { LayoutMotion } from '@/components/motion/MotionRoot';
import {
  TypedText,
  typingMs,
  type TypeMode,
} from '@/components/motion/Typewriter';
import { useLoop, type LoopStep } from '@/components/motion/useLoop';
import { EASE, SPRING } from '@/components/motion/tokens';
import { SAMPLES } from './samples';

// What the demo "types", one per render it shows.
const DEMO = [
  {
    sample: SAMPLES.finance,
    prompt:
      'Finance explainer. Woman holding a torn payslip, bar chart beside her, title “Where it goes”.',
  },
  {
    sample: SAMPLES.techApi,
    prompt:
      'Coding tutorial. Developer pointing at a glowing laptop, title “API in 15 min”.',
  },
  {
    sample: SAMPLES.cooking,
    prompt:
      'Weeknight ramen with a soft egg and rising steam, title “10 min ramen”.',
  },
  {
    sample: SAMPLES.travel,
    prompt:
      'Travel vlog. Leaning out of a yellow tram on a steep street, title “48 hours in Lisbon”.',
  },
];
const N = DEMO.length;
const PROMPTS = DEMO.map((d) => d.prompt);
const at = (i: number) => DEMO[((i % N) + N) % N];

type Step =
  | 'hold'
  | 'clear'
  | 'type'
  | 'cursor'
  | 'press'
  | 'render'
  | 'reveal';

// One cycle produces the next render. 'hold' is first, so the server, a
// paused loop and reduced motion all show a finished thumbnail.
const STEPS: LoopStep<Step>[] = [
  { id: 'hold', ms: 2600 },
  { id: 'clear', ms: 380 },
  { id: 'type', ms: (c) => typingMs(at(c + 1).prompt) },
  { id: 'cursor', ms: 820 },
  { id: 'press', ms: 280 },
  { id: 'render', ms: 1500 },
  { id: 'reveal', ms: 1000 },
];
const AFTER_PRESS: Step[] = ['press', 'render', 'reveal'];

const START_CREDITS = 17;

type Point = { x: number; y: number };

const Cursor = ({ step, from, to }: { step: Step; from: Point; to: Point }) => {
  const moving = step === 'cursor' || step === 'press';
  const shown = step === 'type' || moving;
  const p = moving ? to : from;
  return (
    <m.div
      aria-hidden
      className='pointer-events-none absolute top-0 left-0 z-30 drop-shadow-sm'
      initial={{ opacity: 0, x: from.x, y: from.y }}
      animate={{
        x: p.x,
        y: p.y,
        opacity: shown ? 1 : 0,
        scale: step === 'press' ? [1, 0.82, 1] : 1,
      }}
      transition={{
        x: { duration: step === 'cursor' ? 0.75 : 0, ease: EASE },
        y: { duration: step === 'cursor' ? 0.75 : 0, ease: EASE },
        opacity: { duration: 0.25 },
        scale: { duration: 0.28 },
      }}
    >
      <svg width='18' height='22' viewBox='0 0 18 22'>
        <path
          d='M1 1v17.5l4.6-4.3 3 6.8 3-1.3-3-6.7H15L1 1z'
          fill='var(--foreground)'
          stroke='var(--card)'
          strokeWidth='1.5'
          strokeLinejoin='round'
        />
      </svg>
    </m.div>
  );
};

/** The credits figure; each spend rolls the old number up and out. */
const Credits = ({ value }: { value: number }) => (
  <span className='relative inline-grid overflow-hidden align-bottom font-medium tabular-nums'>
    <AnimatePresence mode='popLayout' initial={false}>
      <m.span
        key={value}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '-100%', opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {value}
      </m.span>
    </AnimatePresence>
  </span>
);

/**
 * A replica of the studio that runs itself: a prompt types, the cursor
 * presses Generate, the canvas renders and the result joins Recent. Built
 * from the same tokens as the real AppShell; every image is a real render.
 */
export const StudioMockup = () => {
  const { ref, step, cycle } = useLoop<Step>(STEPS);
  const promptRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<{ from: Point; to: Point } | null>(null);

  // Where the cursor rests while typing, and the button it travels to.
  useLayoutEffect(() => {
    if (step !== 'type') return;
    const root = ref.current?.getBoundingClientRect();
    const prompt = promptRef.current?.getBoundingClientRect();
    const button = buttonRef.current?.getBoundingClientRect();
    if (!root || !prompt || !button) return;
    setPoints({
      from: {
        x: prompt.right - root.left - 36,
        y: prompt.bottom - root.top - 14,
      },
      to: {
        x: button.left - root.left + button.width * 0.62,
        y: button.top - root.top + button.height * 0.45,
      },
    });
  }, [step, ref]);

  const shown = step === 'reveal' ? cycle + 1 : cycle;
  const current = at(shown);
  const recent = [at(shown - 1), at(shown - 2), at(shown - 3)];

  const typingNext = step !== 'hold' && step !== 'clear';
  const promptMode: TypeMode =
    step === 'clear' ? 'empty' : step === 'type' ? 'typing' : 'full';
  const prompt = typingNext ? at(cycle + 1).prompt : at(cycle).prompt;

  const spent = cycle + (AFTER_PRESS.includes(step) ? 1 : 0);
  const credits = START_CREDITS - (spent % 12);
  const rendering = step === 'render' || step === 'reveal';

  return (
    <LayoutMotion>
      <div
        ref={ref}
        data-ui
        aria-label='The ThumbAI studio: a prompt is typed, Generate is pressed and a thumbnail renders.'
        role='img'
        className='relative overflow-hidden rounded-2xl border bg-card'
      >
        {/* Window bar */}
        <div className='flex items-center gap-2 border-b bg-sidebar px-4 py-2.5'>
          <span className='size-2.5 rounded-full bg-border' />
          <span className='size-2.5 rounded-full bg-border' />
          <span className='size-2.5 rounded-full bg-border' />
          <span className='ml-3 truncate text-xs text-muted-foreground'>
            thumbai.app/studio/text-to-image
          </span>
        </div>

        <div className='grid md:grid-cols-[200px_300px_1fr] lg:grid-cols-[210px_330px_1fr]'>
          {/* Sidebar */}
          <aside
            /* taste-skill-ignore */ className='hidden border-r bg-sidebar p-4 md:block'
          >
            <p className='px-2 pb-2 text-xs text-muted-foreground'>Studio</p>
            <ul className='space-y-0.5 text-sm'>
              <li className='flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 font-medium text-sidebar-accent-foreground'>
                <Type className='size-4' /> Text to Image
              </li>
              <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
                <ImagePlus className='size-4' /> Image to Image
              </li>
              <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
                <FileText className='size-4' /> Blog Cover
              </li>
            </ul>
            <p className='px-2 pt-6 pb-2 text-xs text-muted-foreground'>
              Account
            </p>
            <ul className='text-sm'>
              <li className='flex items-center gap-2 px-2 py-1.5 text-muted-foreground'>
                <LayoutGrid className='size-4' /> Library
              </li>
            </ul>
            <div className='mt-10 rounded-lg bg-accent px-3 py-2.5 text-xs text-accent-foreground'>
              <Credits value={credits} /> credits left
            </div>
          </aside>

          {/* Prompt panel */}
          <div
            /* taste-skill-ignore */ className='order-2 border-t p-4 md:order-none md:border-t-0 md:border-r md:p-5'
          >
            <p className='text-sm font-medium'>Describe your video</p>
            <div
              ref={promptRef}
              className='mt-2 rounded-lg border bg-background p-3 text-sm leading-relaxed text-foreground'
            >
              <TypedText
                text={prompt}
                mode={promptMode}
                reserve={PROMPTS}
                caret
              />
            </div>

            <p className='mt-4 text-sm font-medium'>Size</p>
            <div className='mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs'>
              <span className='rounded-md bg-card py-1.5 text-center font-medium shadow-xs'>
                YouTube 16:9
              </span>
              <span className='py-1.5 text-center text-muted-foreground'>
                Shorts 9:16
              </span>
            </div>

            <p className='mt-4 text-sm font-medium'>Model</p>
            <div className='mt-2 space-y-1.5 text-xs'>
              <div className='flex items-center justify-between rounded-lg border border-brand bg-brand-muted px-3 py-2'>
                <span className='font-medium'>Draft</span>
                <span className='text-muted-foreground'>1 credit</span>
              </div>
              <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
                <span className='font-medium'>Quality</span>
                <span className='text-muted-foreground'>3 credits</span>
              </div>
            </div>

            <m.div
              ref={buttonRef}
              className='btn-brand mt-5 flex h-10 items-center justify-center rounded-lg text-sm font-medium'
              initial={false}
              animate={{ scale: step === 'press' ? [1, 0.96, 1] : 1 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {rendering ? 'Generating…' : 'Generate thumbnail'}
            </m.div>
          </div>

          {/* Canvas */}
          <div className='order-1 bg-background p-4 md:order-none md:p-6'>
            <div className='flex items-center justify-between pb-3 text-xs text-muted-foreground'>
              <span>1280 &times; 720 &middot; Draft</span>
              <span className='inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-foreground'>
                <Download className='size-3.5' /> Download
              </span>
            </div>
            <div className='relative aspect-video overflow-hidden rounded-lg bg-muted'>
              {/* Skeleton: under the images, seen while the next one renders. */}
              <AnimatePresence>
                {rendering && (
                  <m.div
                    key='skeleton'
                    className='absolute inset-0 flex items-center justify-center overflow-hidden bg-muted'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <m.div
                      aria-hidden
                      className='absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.7),transparent)]' // taste-skill-ignore
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                    <span className='relative text-xs font-medium text-muted-foreground'>
                      Rendering&hellip;
                    </span>
                  </m.div>
                )}
              </AnimatePresence>

              {DEMO.map(({ sample }, i) => {
                const visible = sample === current.sample && step !== 'render';
                return (
                  <m.div
                    key={sample.src}
                    className='absolute inset-0'
                    initial={false}
                    animate={{
                      clipPath: visible
                        ? 'inset(0% 0% 0% 0%)'
                        : 'inset(0% 100% 0% 0%)',
                    }}
                    transition={
                      visible ? { duration: 0.9, ease: EASE } : { duration: 0 }
                    }
                  >
                    <Image
                      src={sample.src}
                      alt=''
                      fill
                      priority={i === 0}
                      sizes='(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw'
                      className='object-cover'
                    />
                  </m.div>
                );
              })}
            </div>

            <p className='pt-4 pb-2 text-xs text-muted-foreground'>Recent</p>
            <div className='relative grid grid-cols-3 gap-2'>
              <AnimatePresence mode='popLayout' initial={false}>
                {recent.map(({ sample }) => (
                  <m.div
                    key={sample.src}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={SPRING}
                    className='relative aspect-video overflow-hidden rounded-md'
                  >
                    <Image
                      src={sample.src}
                      alt=''
                      fill
                      sizes='(min-width: 768px) 200px, 33vw'
                      className='object-cover'
                    />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {points && <Cursor step={step} from={points.from} to={points.to} />}
      </div>
    </LayoutMotion>
  );
};
