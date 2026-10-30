import type { ReactNode } from 'react';

/**
 * Floating readout anchored to a point inside a relative container. Flips to
 * the left of the point past the container's midline so it never overflows.
 */
export const ChartTooltip = ({
  x,
  y,
  containerWidth,
  children,
}: {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}) => {
  const flip = x > containerWidth / 2;
  return (
    <div
      role='status'
      className='pointer-events-none absolute z-10 min-w-32 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md'
      style={{
        top: Math.max(0, y),
        ...(flip ? { right: containerWidth - x + 12 } : { left: x + 12 }),
      }}
    >
      {children}
    </div>
  );
};

/** One tooltip row: line key, value (strong), then the series name. */
export const TooltipRow = ({
  color,
  value,
  label,
}: {
  color?: string;
  value: ReactNode;
  label: string;
}) => (
  <div className='flex items-center gap-2 py-0.5'>
    {color && (
      <span
        aria-hidden
        className='h-0.5 w-3 shrink-0 rounded-full'
        style={{ background: color }}
      />
    )}
    <span className='font-mono font-medium tabular-nums text-foreground'>
      {value}
    </span>
    <span className='text-muted-foreground'>{label}</span>
  </div>
);
