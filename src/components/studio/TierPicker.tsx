'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelDefinition, ModelTier } from '@/config/models';

const credits = (n: number) => `${n} ${n === 1 ? 'credit' : 'credits'}`;

/** Draft vs Quality as two side-by-side cards with their per-image price. */
export const TierPicker = ({
  models,
  value,
  onChange,
}: {
  models: Record<ModelTier, ModelDefinition>;
  value: ModelTier;
  onChange: (tier: ModelTier) => void;
}) => (
  <div
    role='radiogroup'
    aria-label='Model tier'
    className='grid grid-cols-2 gap-2.5'
  >
    {(Object.keys(models) as ModelTier[]).map((key) => {
      const model = models[key];
      const selected = value === key;
      return (
        <button
          key={key}
          type='button'
          role='radio'
          aria-checked={selected}
          onClick={() => onChange(key)}
          className={cn(
            'relative flex flex-col rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
            selected
              ? 'border-brand bg-accent'
              : 'bg-background hover:border-foreground/20',
          )}
        >
          <span className='flex items-center justify-between'>
            <span className='text-sm font-medium'>{model.label}</span>
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full border',
                selected
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'bg-card',
              )}
            >
              {selected && <Check className='size-3' strokeWidth={3} />}
            </span>
          </span>
          <span className='mt-1 font-mono text-xs tabular-nums text-brand'>
            {credits(model.creditsPerImage)} / image
          </span>
          <span className='mt-2 text-xs leading-snug text-muted-foreground'>
            {model.description}
          </span>
        </button>
      );
    })}
  </div>
);

/** Read-only counterpart for workflows that run on a single fixed model. */
export const FixedModelNote = ({ model }: { model: ModelDefinition }) => (
  <div className='flex items-start justify-between gap-3 rounded-xl border bg-background p-3'>
    <div>
      <p className='text-sm font-medium'>{model.label} model</p>
      <p className='mt-1 text-xs leading-snug text-muted-foreground'>
        {model.description}
      </p>
    </div>
    <span className='shrink-0 font-mono text-xs tabular-nums text-brand'>
      {credits(model.creditsPerImage)} / image
    </span>
  </div>
);
