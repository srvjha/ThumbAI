'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { animate, m, useMotionValue } from 'framer-motion';
import { Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TypedText,
  typingMs,
  type TypeMode,
} from '@/components/motion/Typewriter';
import { useLoop, type LoopStep } from '@/components/motion/useLoop';
import { EASE } from '@/components/motion/tokens';
import { RenderSkeleton } from './demo-parts';
import { SAMPLES, type Sample } from './samples';
import { YouTubeIcon } from './YouTubeIcon';

// One prompt per pair; every title and channel is made up.
const PAIRS = [
  {
    prompt:
      'Dawn run across a bridge, me in the frame, title “30 days of 5am”. Short: sunrise summit.',
    video: SAMPLES.fitness,
    title: 'I ran at 5am for 30 days',
    channel: 'Tempo Club',
    meta: '212K views · 3 days ago',
    duration: '14:32',
    short: SAMPLES.shortSummit,
    shortTitle: '4am was worth it',
    handle: '@tempoclub',
  },
  {
    prompt:
      'Honest review, me holding green headphones, title “Worth $399?”. Short: silent keyboard test.',
    video: SAMPLES.review,
    title: 'Are $399 headphones worth it? An honest review',
    channel: 'Signal & Noise',
    meta: '86K views · 1 day ago',
    duration: '18:05',
    short: SAMPLES.shortKeyboard,
    shortTitle: 'Is this keyboard actually silent?',
    handle: '@signalnoise',
  },
  {
    prompt:
      'API tutorial, me pointing at a glowing laptop, title “API in 15 min”. Short: the crispy rice trick.',
    video: SAMPLES.techApi,
    title: 'Build a REST API in 15 minutes',
    channel: 'Byte Sized',
    meta: '341K views · 1 week ago',
    duration: '15:12',
    short: SAMPLES.shortRice,
    shortTitle: 'The crispy rice trick',
    handle: '@bytesized',
  },
] as const;
const N = PAIRS.length;
const mod = (i: number) => ((i % N) + N) % N;
const at = (i: number) => PAIRS[mod(i)];
const pick = <K extends keyof (typeof PAIRS)[number]>(k: K) =>
  PAIRS.map((p) => p[k]);

const PROMPTS = pick('prompt');
const VIDEOS: Sample[] = pick('video');
const SHORTS: Sample[] = pick('short');

type Step =
  | 'hold'
  | 'clear'
  | 'type'
  | 'attach'
  | 'press'
  | 'render'
  | 'reveal';

const HOLD_MS = 3400;

// 'hold' comes first, so the server, a paused loop and reduced motion all
// show a finished pair.
const STEPS: LoopStep<Step>[] = [
  { id: 'hold', ms: HOLD_MS },
  { id: 'clear', ms: 380 },
  { id: 'type', ms: (c) => typingMs(at(c + 1).prompt) },
  { id: 'attach', ms: 750 },
  { id: 'press', ms: 300 },
  { id: 'render', ms: 1400 },
  { id: 'reveal', ms: 1000 },
];

/** Every candidate string stacked in one cell: the slot never changes size. */
const Fade = ({
  items,
  active,
  show,
  className,
  itemClassName,
}: {
  items: readonly string[];
  active: number;
  show: boolean;
  className?: string;
  itemClassName?: string;
}) => (
  <span className={cn('grid', className)}>
    {items.map((t, i) => (
      <m.span
        key={i}
        aria-hidden={i !== active}
        className={cn('col-start-1 row-start-1', itemClassName)}
        initial={false}
        animate={{ opacity: show && i === active ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {t}
      </m.span>
    ))}
  </span>
);

/** Stacked renders; the active one wipes in left to right. */
const Wipe = ({
  samples,
  active,
  show,
  sizes,
  className,
}: {
  samples: readonly Sample[];
  active: number;
  show: boolean;
  sizes: string;
  className: string;
}) => (
  <div className={cn('relative overflow-hidden bg-neutral-200', className)}>
    <RenderSkeleton show={!show} />
    {samples.map((s, i) => {
      const visible = show && i === active;
      return (
        <m.div
          key={s.src}
          className='absolute inset-0'
          initial={false}
          animate={{
            clipPath: visible ? 'inset(0% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)',
          }}
          transition={visible ? { duration: 0.9, ease: EASE } : { duration: 0 }}
        >
          <Image
            src={s.src}
            alt=''
            fill
            sizes={sizes}
            className='object-cover'
          />
        </m.div>
      );
    })}
  </div>
);

/** A platform label: the unmodified icon beside plain text. Never animated. */
const PlatformLabel = ({ children }: { children: string }) => (
  <p className='mb-2 flex items-center gap-1.5 text-sm font-medium'>
    <YouTubeIcon className='h-3.5' />
    {children}
  </p>
);

/**
 * A prompt types, a photo is attached, Generate is pressed, and a YouTube
 * watch card and a Shorts phone receive their renders together.
 */
export const YouTubeDemo = () => {
  const { ref, step, cycle, playing } = useLoop<Step>(STEPS);

  const shown = mod(step === 'reveal' ? cycle + 1 : cycle);
  const pair = PAIRS[shown];
  const ready = step !== 'render';

  const typingNext = step !== 'hold' && step !== 'clear';
  const promptMode: TypeMode =
    step === 'clear' ? 'empty' : step === 'type' ? 'typing' : 'full';
  const prompt = typingNext ? at(cycle + 1).prompt : at(cycle).prompt;
  const attached = step !== 'clear' && step !== 'type';

  // Playback progress: empties with each new render, fills while it holds.
  const progress = useMotionValue(1);
  useEffect(() => {
    if (step === 'render') {
      progress.set(0);
      return;
    }
    if (step !== 'hold' || !playing) return;
    const controls = animate(progress, 1, {
      duration: ((1 - progress.get()) * HOLD_MS) / 1000,
      ease: 'linear',
    });
    return () => controls.stop();
  }, [step, playing, progress]);

  return (
    <div
      ref={ref}
      data-ui
      role='img'
      aria-label={`A prompt is typed, a photo is attached and Generate is pressed. A YouTube thumbnail and a Shorts cover arrive together: “${pair.title}” and “${pair.shortTitle}”.`}
    >
      {/* Composer */}
      <div className='rounded-2xl border bg-card p-3 sm:p-4'>
        <div className='rounded-lg border bg-background p-3 text-sm leading-relaxed'>
          <TypedText text={prompt} mode={promptMode} reserve={PROMPTS} caret />
        </div>
        <div className='mt-3 flex items-center justify-between gap-3'>
          <span className='grid'>
            <m.span
              className='col-start-1 row-start-1 inline-flex items-center gap-1.5 self-center px-1 text-xs text-muted-foreground'
              initial={false}
              animate={{ opacity: attached ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Paperclip className='size-3.5' /> Attach image
            </m.span>
            <m.span
              className='col-start-1 row-start-1 inline-flex origin-left items-center gap-1.5 rounded-full bg-muted py-1 pr-2.5 pl-1 text-xs font-medium'
              initial={false}
              animate={{
                opacity: attached ? 1 : 0,
                scale: attached ? 1 : 0.85,
              }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <Image
                src={SAMPLES.sourcePortrait.src}
                alt=''
                width={20}
                height={20}
                className='size-5 rounded-full object-cover'
              />
              me.jpg
            </m.span>
          </span>
          <m.span
            className='btn-brand inline-grid h-9 items-center rounded-lg px-4 text-sm font-medium'
            initial={false}
            animate={{ scale: step === 'press' ? [1, 0.95, 1] : 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <span className='invisible col-start-1 row-start-1'>
              Generating…
            </span>
            <span className='col-start-1 row-start-1 text-center'>
              {step === 'press' || step === 'render'
                ? 'Generating…'
                : 'Generate'}
            </span>
          </m.span>
        </div>
      </div>

      {/* Outputs: the watch card and the phone at their real ratios, the
          phone 40% of the card's width and sitting on its baseline. */}
      <div className='mt-5 grid gap-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)] sm:items-end sm:gap-4'>
        <div>
          <PlatformLabel>YouTube video</PlatformLabel>
          <div className='rounded-xl bg-white p-2.5 text-neutral-950 sm:p-3'>
            <div className='relative'>
              <Wipe
                samples={VIDEOS}
                active={shown}
                show={ready}
                sizes='(min-width: 1024px) 420px, (min-width: 640px) 60vw, 100vw'
                className='aspect-video rounded-lg'
              />
              <Fade
                items={pick('duration')}
                active={shown}
                show={ready}
                className='absolute right-1.5 bottom-2.5 rounded bg-black/80 px-1 py-px text-[11px] font-medium text-white tabular-nums'
              />
              {/* Watched-progress bar along the thumbnail's bottom edge. */}
              <div className='absolute inset-x-0 bottom-0 h-[3px] overflow-hidden rounded-b-lg bg-neutral-400/60'>
                <m.div
                  className='h-full origin-left bg-[#FF0000]'
                  style={{ scaleX: progress }}
                />
              </div>
            </div>
            <div className='mt-3 flex gap-2.5'>
              <Fade
                items={PAIRS.map((p) => p.channel[0])}
                active={shown}
                show={ready}
                className='size-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700'
              />
              <div className='min-w-0 flex-1'>
                <Fade
                  items={pick('title')}
                  active={shown}
                  show={ready}
                  className='text-sm leading-snug font-medium'
                  itemClassName='line-clamp-2'
                />
                <Fade
                  items={PAIRS.map((p) => `${p.channel} · ${p.meta}`)}
                  active={shown}
                  show={ready}
                  className='mt-0.5 text-xs text-neutral-600'
                  itemClassName='truncate'
                />
              </div>
            </div>
          </div>
        </div>

        <div className='mx-auto w-[min(56%,200px)] sm:w-full'>
          <PlatformLabel>YouTube Shorts</PlatformLabel>
          <div className='rounded-[1.6rem] bg-neutral-900 p-[5px]'>
            <div className='relative overflow-hidden rounded-[1.3rem]'>
              <Wipe
                samples={SHORTS}
                active={shown}
                show={ready}
                sizes='(min-width: 1024px) 170px, (min-width: 640px) 25vw, 200px'
                className='aspect-[9/16]'
              />
              {/* Action rail */}
              <div
                aria-hidden
                className='absolute right-1.5 bottom-14 flex flex-col gap-2'
              >
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className='size-5 rounded-full bg-white/35' />
                ))}
              </div>
              {/* Title overlay, kept legible on any photo. */}
              <div
                /* taste-skill-ignore */ className='absolute inset-x-0 bottom-0 px-2.5 pr-9 pb-3 text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]'
              >
                <div className='flex items-center gap-1.5'>
                  <span className='size-4 shrink-0 rounded-full bg-white/85' />
                  <Fade
                    items={pick('handle')}
                    active={shown}
                    show={ready}
                    className='min-w-0 text-[10px] font-medium'
                    itemClassName='truncate'
                  />
                </div>
                <Fade
                  items={pick('shortTitle')}
                  active={shown}
                  show={ready}
                  className='mt-1 text-[11px] leading-tight font-medium'
                  itemClassName='line-clamp-2'
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
