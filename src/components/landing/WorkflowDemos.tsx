'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TypedText,
  typingMs,
  type TypeMode,
} from '@/components/motion/Typewriter';
import { useLoop, type LoopStep } from '@/components/motion/useLoop';
import { EASE } from '@/components/motion/tokens';
import { SAMPLES } from './samples';
import { WipeStack } from './demo-parts';

/*
 * Each bento card runs its own short loop. Every loop starts on 'hold', the
 * finished state, which is also what the server and reduced motion show.
 */

// Text to image: type the prompt, render, wipe the image in.

const TEXT_DEMOS = [
  {
    sample: SAMPLES.techApi,
    prompt:
      '“Coding tutorial, build an API in 15 minutes, title ‘API in 15 min’”',
  },
  {
    sample: SAMPLES.gaming,
    prompt: '“Survival series, day 100 in the frozen north, title ‘Day 100’”',
  },
];
const TEXT_PROMPTS = TEXT_DEMOS.map((d) => d.prompt);
const TEXT_SAMPLES = TEXT_DEMOS.map((d) => d.sample);

type TextStep = 'hold' | 'clear' | 'type' | 'render' | 'reveal';
const TEXT_STEPS: LoopStep<TextStep>[] = [
  { id: 'hold', ms: 3200 },
  { id: 'clear', ms: 350 },
  { id: 'type', ms: (c) => typingMs(TEXT_DEMOS[(c + 1) % 2].prompt) },
  { id: 'render', ms: 1100 },
  { id: 'reveal', ms: 900 },
];

export const TextToImageDemo = () => {
  const { ref, step, cycle } = useLoop<TextStep>(TEXT_STEPS);
  // From 'clear' on, the card is working on the next prompt.
  const working = step !== 'hold';
  const idx = (working ? cycle + 1 : cycle) % 2;
  const mode: TypeMode =
    step === 'clear' ? 'empty' : step === 'type' ? 'typing' : 'full';

  return (
    <div ref={ref}>
      <div className='mt-6 rounded-lg bg-background px-4 py-3 text-sm'>
        <TypedText
          text={TEXT_PROMPTS[idx]}
          mode={mode}
          reserve={TEXT_PROMPTS}
          caret
        />
      </div>
      <div className='mt-3'>
        <WipeStack
          samples={TEXT_SAMPLES}
          active={idx}
          show={step === 'hold' || step === 'reveal'}
          sizes='(min-width: 1024px) 620px, 100vw'
          label={TEXT_SAMPLES[idx].alt}
        />
      </div>
    </div>
  );
};

// Image to image: scan the upload, then crossfade into the edit.

type EditStep = 'hold' | 'reset' | 'scan' | 'reveal';
const EDIT_STEPS: LoopStep<EditStep>[] = [
  { id: 'hold', ms: 3200 },
  { id: 'reset', ms: 500 },
  { id: 'scan', ms: 1600 },
  { id: 'reveal', ms: 900 },
];

export const ImageToImageDemo = () => {
  const { ref, step } = useLoop<EditStep>(EDIT_STEPS);
  const edited = step === 'hold' || step === 'reveal';

  return (
    <div
      ref={ref}
      className='mt-6 grid grid-cols-[0.8fr_auto_1fr] items-center gap-3 lg:grid-cols-1'
    >
      <div className='relative aspect-square w-full overflow-hidden rounded-lg lg:w-32'>
        <Image
          src={SAMPLES.sourcePortrait.src}
          alt={SAMPLES.sourcePortrait.alt}
          fill
          sizes='(min-width: 1024px) 128px, 30vw'
          className='object-cover'
        />
        {/* The scan: a full-height track moved down by its own height. */}
        {step === 'scan' && (
          <m.div
            aria-hidden
            className='absolute inset-x-0 -top-full h-full'
            initial={{ y: '0%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          >
            <div className='absolute inset-x-0 bottom-0 h-8 bg-brand/15' />
            <div className='absolute inset-x-0 bottom-0 h-0.5 bg-brand shadow-[0_0_10px_rgb(62_99_221/0.8)]' />
          </m.div>
        )}
      </div>
      <ArrowRight
        aria-hidden
        className='size-5 text-muted-foreground lg:rotate-90'
      />
      <div className='relative aspect-video w-full overflow-hidden rounded-lg bg-muted'>
        {/* Before the edit lands, the frame holds a soft copy of the upload. */}
        <Image
          src={SAMPLES.sourcePortrait.src}
          alt=''
          fill
          sizes='(min-width: 1024px) 440px, 55vw'
          className='scale-110 object-cover blur-md'
        />
        <m.div
          className='absolute inset-0'
          initial={false}
          animate={{ opacity: edited ? 1 : 0 }}
          transition={{ duration: edited ? 0.8 : 0.3, ease: EASE }}
        >
          <Image
            src={SAMPLES.editNotes.src}
            alt={SAMPLES.editNotes.alt}
            fill
            sizes='(min-width: 1024px) 440px, 55vw'
            className='object-cover'
          />
        </m.div>
      </div>
    </div>
  );
};

// Blog cover: the URL types in, the checklist ticks, the cover reveals.

const BLOG_URL = 'yourblog.com/quiet-economics-of-open-source';
const CHECKS = ['Fetched the post', 'Found the argument', 'Set the title'];

type BlogStep = 'hold' | 'clear' | 'type' | 'c1' | 'c2' | 'c3' | 'reveal';
const BLOG_STEPS: LoopStep<BlogStep>[] = [
  { id: 'hold', ms: 3400 },
  { id: 'clear', ms: 400 },
  { id: 'type', ms: typingMs(BLOG_URL) },
  { id: 'c1', ms: 650 },
  { id: 'c2', ms: 650 },
  { id: 'c3', ms: 650 },
  { id: 'reveal', ms: 900 },
];

/** The whole blog card body; the heading and link come in as slots. */
export const BlogCoverDemo = ({
  intro,
  action,
}: {
  intro: ReactNode;
  action: ReactNode;
}) => {
  const { ref, step, index } = useLoop<BlogStep>(BLOG_STEPS);
  const done = step === 'hold' ? CHECKS.length : Math.max(0, index - 2);
  const mode: TypeMode =
    step === 'clear' ? 'empty' : step === 'type' ? 'typing' : 'full';

  return (
    <div
      ref={ref}
      className='grid gap-6 md:grid-cols-[1fr_1.3fr] md:items-center lg:gap-12'
    >
      <div>
        {intro}
        <div className='mt-6 flex items-center gap-2 rounded-lg bg-background px-3 py-2.5 text-sm'>
          <Link2
            aria-hidden
            className='size-4 shrink-0 text-muted-foreground'
          />
          <TypedText
            text={BLOG_URL}
            mode={mode}
            caret
            className='min-w-0 flex-1 grid-cols-[minmax(0,1fr)] [&>span]:truncate'
          />
        </div>
        <ul className='mt-4 space-y-2 text-sm'>
          {CHECKS.map((label, i) => {
            const checked = i < done;
            return (
              <li key={label} className='flex items-center gap-2.5'>
                <span
                  className={cn(
                    'relative grid size-5 place-items-center rounded-full transition-colors duration-300',
                    checked ? 'bg-brand text-brand-foreground' : 'bg-muted',
                  )}
                >
                  <m.span
                    initial={false}
                    animate={{
                      scale: checked ? 1 : 0,
                      opacity: checked ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <Check className='size-3' strokeWidth={3} />
                  </m.span>
                </span>
                <span
                  className={cn(
                    'transition-colors duration-300',
                    checked ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <div className='mt-6'>{action}</div>
      </div>
      <WipeStack
        samples={[SAMPLES.blogOpenSource]}
        active={0}
        show={step === 'hold' || step === 'reveal'}
        sizes='(min-width: 1024px) 620px, (min-width: 768px) 55vw, 100vw'
        label={SAMPLES.blogOpenSource.alt}
      />
    </div>
  );
};
