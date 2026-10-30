'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Flips between light and dark. The icon swaps through the `dark:` variant,
 * so the server render matches whatever theme the client lands on.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Toggle dark mode'
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn('size-9 text-muted-foreground', className)}
        >
          <Sun className='size-4 dark:hidden' />
          <Moon className='hidden size-4 dark:block' />
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom'>Toggle dark mode</TooltipContent>
    </Tooltip>
  );
};

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/** Light / Dark / System, for settings screens. */
export const ThemeSelect = () => {
  const { theme, setTheme } = useTheme();
  // The stored choice is only known on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ToggleGroup
      type='single'
      variant='outline'
      value={mounted ? theme : undefined}
      onValueChange={(value) => value && setTheme(value)}
      aria-label='Theme'
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value} className='gap-1.5 px-3'>
          <Icon className='size-4' />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
