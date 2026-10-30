import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationStatus } from './types';

/** Shown only for states that need attention; completed rows stay quiet. */
export const StatusChip = ({
  status,
  className,
}: {
  status: GenerationStatus;
  className?: string;
}) => {
  if (status === 'COMPLETED') return null;
  const failed = status === 'FAILED';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border bg-card px-1.5 py-0.5 text-[11px] font-medium',
        failed ? 'text-destructive' : 'text-accent-foreground',
        className,
      )}
    >
      {failed ? (
        <AlertCircle className='size-3' />
      ) : (
        <Loader2 className='size-3 animate-spin' />
      )}
      {failed ? 'Failed' : status === 'PENDING' ? 'Queued' : 'Generating'}
    </span>
  );
};
