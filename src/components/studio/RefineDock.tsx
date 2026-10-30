'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import type { UIMessage } from 'ai';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export const QUICK_REFINES = [
  'Make the title bigger',
  'Boost contrast',
  'Simplify background',
  'Remove text',
];

const textOf = (message: UIMessage) =>
  message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();

/**
 * Typed refinement under the canvas. Each send goes through the workflow's
 * existing chat-edit flow and lands as a new version on the canvas.
 */
export const RefineDock = ({
  onSend,
  onRetry,
  messages,
  busy,
  creditCost,
}: {
  onSend: (text: string) => void;
  onRetry: () => void;
  messages: UIMessage[];
  busy: boolean;
  creditCost: number;
}) => {
  const [input, setInput] = useState('');
  const recent = messages.slice(-2);
  const reduceMotion = useReducedMotion();

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setInput('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(input);
  };

  // Enter sends, Shift+Enter breaks the line.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className='rounded-2xl border bg-card px-4 py-3'>
      <motion.div
        initial={false}
        animate={{ height: recent.length > 0 ? 'auto' : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
        className='overflow-hidden'
      >
        <ul className='space-y-1.5 pb-2.5' aria-label='Recent refinements'>
          {recent.map((message, i) => (
            <li
              key={message.id}
              className={cn(
                'flex items-start gap-2 text-xs',
                message.role === 'user'
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <span className='w-8 shrink-0 text-muted-foreground'>
                {message.role === 'user' ? 'You' : 'Studio'}
              </span>
              <span className='min-w-0 flex-1 truncate'>{textOf(message)}</span>
              {message.role === 'assistant' && i === recent.length - 1 && (
                <button
                  type='button'
                  onClick={onRetry}
                  disabled={busy}
                  className='flex shrink-0 items-center gap-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'
                >
                  <RefreshCcw className='size-3' />
                  Retry
                </button>
              )}
            </li>
          ))}
        </ul>
      </motion.div>

      <div className='mb-2 flex flex-wrap gap-1.5'>
        {QUICK_REFINES.map((chip) => (
          <button
            key={chip}
            type='button'
            disabled={busy}
            onClick={() => send(chip)}
            className='h-7 rounded-full border bg-background px-3 text-xs text-foreground transition-colors hover:border-brand hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50'
          >
            {chip}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className='flex items-end gap-2 rounded-xl border bg-background p-1.5 focus-within:border-brand'
      >
        <label htmlFor='refine-input' className='sr-only'>
          Describe a change
        </label>
        <textarea
          id='refine-input'
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Describe a change, e.g. move the subject to the left…'
          className='max-h-24 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/70 focus:outline-none'
        />
        <span className='hidden pb-2 text-[11px] tabular-nums text-muted-foreground sm:block'>
          {creditCost} {creditCost === 1 ? 'credit' : 'credits'} / edit
        </span>
        <Button
          type='submit'
          size='icon'
          variant='brand'
          disabled={!input.trim() || busy}
          aria-label='Apply change'
          className='size-8 shrink-0 rounded-lg'
        >
          {busy ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <ArrowUp className='size-4' />
          )}
        </Button>
      </form>
    </div>
  );
};
