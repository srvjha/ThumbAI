'use client';

import Link from 'next/link';
import { Loader2, RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Kbd } from '../ui/kbd';
import { useModKey } from './useMediaQuery';
import { cn } from '@/lib/utils';

/**
 * Foot of the controls panel: what this run costs against what you have,
 * and the button that spends it.
 */
export const GenerateBar = ({
  cost,
  costNote,
  balance,
  isGenerating,
  disabled,
  label,
  busyLabel = 'Generating…',
  onReset,
}: {
  cost: number;
  /** Small print under the cost, e.g. how it was worked out. */
  costNote?: string;
  balance?: number;
  isGenerating: boolean;
  disabled: boolean;
  label: string;
  busyLabel?: string;
  onReset: () => void;
}) => {
  const short = balance !== undefined && balance < cost;
  const mod = useModKey();
  return (
    <div className='sticky bottom-0 z-10 border-t bg-card p-4 lg:static'>
      <div className='mb-3 flex items-end justify-between gap-3 text-xs'>
        <div>
          <p className='text-muted-foreground'>This run</p>
          <p className='mt-0.5 text-sm'>
            <span className='font-mono text-base tabular-nums text-foreground'>
              {cost}
            </span>{' '}
            <span className='text-muted-foreground'>
              {cost === 1 ? 'credit' : 'credits'}
            </span>
          </p>
          {costNote && (
            <p className='mt-0.5 text-[11px] text-muted-foreground'>
              {costNote}
            </p>
          )}
        </div>
        <div className='text-right'>
          <p className='text-muted-foreground'>Balance</p>
          <p
            className={cn(
              'mt-0.5 font-mono text-base tabular-nums',
              short ? 'text-destructive' : 'text-foreground',
            )}
          >
            {balance ?? '—'}
          </p>
          {short && (
            <Link
              href='/billing'
              className='text-[11px] text-brand underline-offset-2 hover:underline'
            >
              Top up
            </Link>
          )}
        </div>
      </div>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={onReset}
          title='Reset form'
          aria-label='Reset form'
          className='h-11 w-11 shrink-0 rounded-xl'
        >
          <RotateCcw className='size-4' />
        </Button>
        <Button
          type='submit'
          variant='brand'
          disabled={disabled}
          className='h-11 flex-1 rounded-xl text-sm'
        >
          {isGenerating ? (
            <>
              <Loader2 className='size-4 animate-spin' />
              {busyLabel}
            </>
          ) : (
            <>
              <Wand2 className='size-4' />
              {label}
              <Kbd className='ml-1 hidden bg-white/20 text-white sm:inline-flex'>
                {mod}↵
              </Kbd>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
