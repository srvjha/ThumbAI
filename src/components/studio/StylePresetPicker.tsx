'use client';

import { useState } from 'react';
import { Check, ChevronDown, Palette, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { STYLE_PRESETS, presetById } from './presets';
import { cn } from '@/lib/utils';

/** A look to steer the render, picked from real samples. Optional. */
export const StylePresetPicker = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = presetById(value);

  return (
    <div className='flex items-center gap-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-input bg-background px-2 text-left text-sm transition-colors hover:border-foreground/20 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30'
          >
            {current ? (
              <img
                src={current.image}
                alt=''
                className='h-7 w-12 shrink-0 rounded object-cover'
              />
            ) : (
              <span className='flex h-7 w-12 shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground'>
                <Palette className='size-4' />
              </span>
            )}
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                !current && 'text-muted-foreground',
              )}
            >
              {current ? current.label : 'Pick a look (optional)'}
            </span>
            <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='w-[min(26rem,calc(100vw-2rem))] p-2'
        >
          <div
            role='listbox'
            aria-label='Style presets'
            className='grid grid-cols-2 gap-2'
          >
            {STYLE_PRESETS.map((preset) => {
              const selected = preset.id === value;
              return (
                <button
                  key={preset.id}
                  type='button'
                  role='option'
                  aria-selected={selected}
                  onClick={() => {
                    onChange(selected ? '' : preset.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'group overflow-hidden rounded-lg border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    selected
                      ? 'border-brand ring-1 ring-brand'
                      : 'hover:border-foreground/20',
                  )}
                >
                  <span className='relative block aspect-video bg-secondary'>
                    <img
                      src={preset.image}
                      alt=''
                      loading='lazy'
                      className='h-full w-full object-cover'
                    />
                    {selected && (
                      <span className='absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground'>
                        <Check className='size-3' strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className='block px-2 py-1.5 text-xs font-medium'>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {current && (
        <button
          type='button'
          onClick={() => onChange('')}
          aria-label='Clear look'
          className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground'
        >
          <X className='size-4' />
        </button>
      )}
    </div>
  );
};
