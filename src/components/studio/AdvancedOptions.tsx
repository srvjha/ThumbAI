'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { cn } from '@/lib/utils';

/** Settings most people never touch, folded away under one disclosure. */
export const AdvancedOptions = ({
  summary,
  children,
}: {
  summary?: string;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className='border-t pt-4'>
      <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'>
        <span>Advanced</span>
        <span className='flex items-center gap-2 text-xs font-normal text-muted-foreground'>
          {!open && summary}
          <ChevronDown
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </span>
      </CollapsibleTrigger>
      {/* forceMount keeps the fields registered while collapsed. */}
      <CollapsibleContent forceMount className='data-[state=closed]:hidden'>
        <div className='space-y-5 pt-4'>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
