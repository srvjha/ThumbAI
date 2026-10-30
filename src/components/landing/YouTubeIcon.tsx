import { cn } from '@/lib/utils';

/**
 * YouTube's play-button icon at its official proportions and colours, used
 * unmodified as a platform label only. Never wrap it in anything that
 * animates, recolours or distorts it (YouTube brand guidelines).
 */
export const YouTubeIcon = ({
  className,
  label,
}: {
  className?: string;
  /** Accessible name; omit when visible text beside it already says YouTube. */
  label?: string;
}) => (
  <svg
    viewBox='0 0 28.57 20'
    className={cn('h-4 w-auto shrink-0', className)}
    {...(label
      ? { role: 'img', 'aria-label': label }
      : { 'aria-hidden': true })}
  >
    <path
      d='M27.973 3.123A3.578 3.578 0 0 0 25.447.597C23.22 0 14.285 0 14.285 0S5.35 0 3.123.597A3.578 3.578 0 0 0 .597 3.123C0 5.35 0 10 0 10s0 4.65.597 6.877a3.578 3.578 0 0 0 2.526 2.526C5.35 20 14.285 20 14.285 20s8.935 0 11.162-.597a3.578 3.578 0 0 0 2.526-2.526C28.57 14.65 28.57 10 28.57 10s-.002-4.65-.597-6.877Z'
      fill='#FF0000'
    />
    <path d='M11.425 14.285 18.848 10l-7.423-4.285v8.57Z' fill='#FFFFFF' />
  </svg>
);
