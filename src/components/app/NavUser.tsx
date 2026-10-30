'use client';

import Link from 'next/link';
import { useClerk, useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import {
  Check,
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const PLAN_LABELS: Record<string, string> = { FREE: 'Free', PAID: 'Paid' };

const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/**
 * The account row at the foot of the sidebar: avatar, name and handle, with
 * a menu for the theme, the profile and signing out.
 */
export const NavUser = ({ email, plan }: { email?: string; plan?: string }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const { isMobile, setOpenMobile } = useSidebar();

  const address = user?.primaryEmailAddress?.emailAddress ?? email ?? '';
  const name = user?.fullName || user?.username || address.split('@')[0];
  const handle = user?.username ? `@${user.username}` : address;
  const planLabel = plan ? (PLAN_LABELS[plan] ?? plan) : null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              tooltip={name || 'Account'}
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='size-8 rounded-full'>
                {user?.imageUrl && <AvatarImage src={user.imageUrl} alt='' />}
                <AvatarFallback className='text-xs'>
                  {initials(name || '?')}
                </AvatarFallback>
              </Avatar>
              <span className='grid min-w-0 flex-1 text-left leading-tight'>
                <span className='truncate text-sm font-medium'>{name}</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {handle}
                </span>
              </span>
              <ChevronsUpDown className='ml-auto size-4 text-muted-foreground' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'top'}
            align='start'
            sideOffset={8}
            className='w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl'
          >
            <DropdownMenuLabel className='flex items-center gap-2 py-2 font-normal'>
              <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
                {address}
              </span>
              {planLabel && (
                <span className='shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium'>
                  {planLabel}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                // Keep the menu open so the change can be seen.
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme(value);
                }}
              >
                <Icon />
                {label}
                {theme === value && <Check className='ml-auto' />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href='/profile'
                onClick={isMobile ? () => setOpenMobile(false) : undefined}
              >
                <UserRound />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/' })}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
