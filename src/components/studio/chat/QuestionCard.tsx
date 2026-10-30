'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { blogQuestionarie, youtubeQuestionarie } from '@/utils/questionarie';
import { cn } from '@/lib/utils';
import type { StyleAnswers } from './types';

type Question = {
  id: string;
  title: string;
  options: { value: string; label: string; description: string }[];
};

const questionsFor = (kind: 'youtube' | 'blog') =>
  (kind === 'blog' ? blogQuestionarie : youtubeQuestionarie) as Question[];

const labelFor = (questions: Question[], id: string, value: string) =>
  questions.find((q) => q.id === id)?.options.find((o) => o.value === value)
    ?.label ?? value;

/** What the answers came to, once the card is closed. */
const Summary = ({
  kind,
  answers,
}: {
  kind: 'youtube' | 'blog';
  answers?: StyleAnswers;
}) => {
  const questions = questionsFor(kind);
  const picked = answers
    ? Object.entries(answers).flatMap(([id, values]) =>
        values.map((v) => labelFor(questions, id, v)),
      )
    : [];
  return (
    <div className='flex items-start gap-2 text-sm text-muted-foreground'>
      <ListChecks className='mt-0.5 size-4 shrink-0' />
      {picked.length > 0 ? (
        <p>
          <span className='text-foreground'>Style:</span> {picked.join(' · ')}
        </p>
      ) : (
        <p>Skipped the style questions. ThumbAI picks the look.</p>
      )}
    </div>
  );
};

/**
 * The style questions, asked in the thread one at a time like a reply.
 * Several options can be picked per question; with none picked, Next skips.
 */
export const QuestionCard = ({
  kind,
  state,
  answers: saved,
  onDone,
}: {
  kind: 'youtube' | 'blog';
  state: 'asking' | 'done' | 'skipped';
  answers?: StyleAnswers;
  onDone: (answers: StyleAnswers | null) => void;
}) => {
  const questions = questionsFor(kind);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<StyleAnswers>({});

  if (state !== 'asking') return <Summary kind={kind} answers={saved} />;

  const question = questions[step];
  const selected = answers[question.id] ?? [];
  const last = step === questions.length - 1;

  const toggle = (value: string) =>
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      return {
        ...prev,
        [question.id]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });

  const finish = () => {
    const filled = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.length > 0),
    );
    onDone(Object.keys(filled).length > 0 ? filled : null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className='overflow-hidden rounded-2xl border bg-card'
    >
      <div className='flex items-center justify-between gap-3 border-b px-4 py-2.5'>
        <p className='text-xs text-muted-foreground'>
          A few questions to shape the style
        </p>
        <div className='flex items-center gap-1' aria-hidden>
          {questions.map((q, i) => (
            <span
              key={q.id}
              className={cn(
                'h-1 rounded-full transition-all',
                i === step ? 'w-4 bg-brand' : 'w-1.5',
                i < step ? 'bg-brand/50' : i > step && 'bg-border',
              )}
            />
          ))}
        </div>
      </div>

      <div className='px-4 pb-3 pt-4'>
        <p className='text-[15px] font-medium' id={`q-${question.id}`}>
          {question.title}
        </p>
        <p className='mt-0.5 text-xs text-muted-foreground'>
          Question {step + 1} of {questions.length} · pick any that fit
        </p>
        <div
          role='group'
          aria-labelledby={`q-${question.id}`}
          className='mt-3 grid gap-1.5 sm:grid-cols-2'
        >
          {question.options.map((option, i) => {
            const on = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type='button'
                aria-pressed={on}
                onClick={() => toggle(option.value)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                  on
                    ? 'border-brand bg-accent'
                    : 'bg-background hover:border-foreground/20',
                )}
              >
                <span
                  className={cn(
                    'mt-px flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] tabular-nums',
                    on
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {on ? <Check className='size-3' strokeWidth={3} /> : i + 1}
                </span>
                <span className='min-w-0'>
                  <span className='block text-sm font-medium'>
                    {option.label}
                  </span>
                  <span className='block text-xs leading-snug text-muted-foreground'>
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className='flex items-center justify-between gap-2 border-t px-4 py-2.5'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-muted-foreground'
          onClick={() => onDone(null)}
        >
          Skip all
        </Button>
        <div className='flex items-center gap-1.5'>
          {step > 0 && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setStep((s) => s - 1)}
              aria-label='Previous question'
            >
              <ChevronLeft className='size-4' />
            </Button>
          )}
          {last ? (
            <Button type='button' variant='brand' size='sm' onClick={finish}>
              Generate
            </Button>
          ) : (
            <Button
              type='button'
              variant={selected.length > 0 ? 'brand' : 'outline'}
              size='sm'
              onClick={() => setStep((s) => s + 1)}
            >
              {selected.length > 0 ? 'Next' : 'Skip question'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
