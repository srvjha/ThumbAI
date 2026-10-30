'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import {
  TypedText,
  typingMs,
  type TypeMode,
} from '@/components/motion/Typewriter';
import { useLoop, type LoopStep } from '@/components/motion/useLoop';
import { EASE } from '@/components/motion/tokens';
import { SAMPLES } from './samples';

const INSTRUCTION = 'Make the notes yellow and tilt the title';

type Step = 'hold' | 'clear' | 'type' | 'press' | 'apply';
const STEPS: LoopStep<Step>[] = [
  { id: 'hold', ms: 3600 },
  { id: 'clear', ms: 400 },
  { id: 'type', ms: typingMs(INSTRUCTION) },
  { id: 'press', ms: 420 },
  { id: 'apply', ms: 1300 },
];

/**
 * A slice of the studio: one render and a follow-up edit typed into the
 * refine bar. Refine pulses once, then the image shimmers as it updates.
 */
export const RefineDemo = () => {
  const { ref, step } = useLoop<Step>(STEPS);
  const mode: TypeMode =
    step === 'clear' ? 'empty' : step === 'type' ? 'typing' : 'full';

  return (
    <div
      ref={ref}
      data-ui
      className='rounded-2xl bg-card p-3 text-foreground sm:p-4'
    >
      <div className='relative aspect-video overflow-hidden rounded-lg'>
        <Image
          src={SAMPLES.editNotes.src}
          alt={SAMPLES.editNotes.alt}
          fill
          sizes='(min-width: 1024px) 560px, 100vw'
          className='object-cover'
        />
        {step === 'apply' && (
          <m.div
            aria-hidden
            className='absolute inset-y-0 left-0 w-2/5 bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.55),transparent)]' // taste-skill-ignore
            initial={{ x: '-100%' }}
            animate={{ x: '260%' }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        )}
      </div>
      <div className='mt-3 flex items-center gap-2 rounded-lg bg-background p-2 pl-3 text-sm'>
        <TypedText
          text={INSTRUCTION}
          mode={mode}
          caret
          className='min-w-0 flex-1 grid-cols-[minmax(0,1fr)] [&>span]:truncate'
        />
        <m.span
          className='btn-brand shrink-0 rounded-md px-3 py-1.5 text-xs font-medium'
          initial={false}
          animate={{ scale: step === 'press' ? [1, 1.06, 0.97, 1] : 1 }}
          transition={{ duration: 0.42, ease: EASE }}
        >
          Refine &middot; 2 credits
        </m.span>
      </div>
    </div>
  );
};
