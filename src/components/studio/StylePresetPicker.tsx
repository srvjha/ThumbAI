'use client';

import { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { STYLE_PRESETS, presetById } from './presets';
import { chipClass } from './controls';
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
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type='button' className={chipClass(!!current)}>
              {current ? (
                <img
                  src={current.image}
                  alt=''
                  width={24}
                  height={14}
                  className='h-3.5 w-6 rounded-[3px] object-cover'
                />
              ) : (
                <Palette className='size-4' />
              )}
              <span className='max-w-32 truncate'>
                {current ? current.label : 'Look'}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>A visual style, from real samples</TooltipContent>
      </Tooltip>
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
  );
};
