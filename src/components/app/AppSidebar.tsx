'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  BarChart3,
  CreditCard,
  FileText,
  ImagePlus,
  LayoutGrid,
  Shield,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/user/auth';
import { Logo } from '@/components/brand/Logo';
import { NavUser } from './NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { ReactNode } from 'react';

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const STUDIO_NAV: NavItem[] = [
  { label: 'Text to image', href: '/studio/text-to-image', icon: Type },
  { label: 'Image to image', href: '/studio/image-to-image', icon: ImagePlus },
  { label: 'Blog cover', href: '/studio/blog-cover', icon: FileText },
];

export const ACCOUNT_NAV: NavItem[] = [
  { label: 'Library', href: '/dashboard', icon: LayoutGrid },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Credits & billing', href: '/billing', icon: CreditCard },
  { label: 'Profile', href: '/profile', icon: UserRound },
];

const ADMIN_NAV: NavItem[] = [{ label: 'Admin', href: '/admin', icon: Shield }];

// /dashboard must not light up while on /dashboard/analytics.
export const isNavActive = (href: string, pathname: string) =>
  href === '/dashboard' ? pathname === href : pathname.startsWith(href);

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const useAccount = () => {
  const { isSignedIn, isLoaded } = useUser();
  return useAuth({ enabled: isLoaded && !!isSignedIn });
};

const NavGroup = ({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) => {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='whitespace-nowrap'>
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ label, href, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                isActive={isNavActive(href, pathname)}
                tooltip={label}
                className='whitespace-nowrap'
              >
                <Link
                  href={href}
                  onClick={isMobile ? () => setOpenMobile(false) : undefined}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

/** Full card when expanded; a balance chip on the icon rail. */
const Credits = ({ credits }: { credits: number | undefined }) => {
  const label = credits === undefined ? '—' : credits.toLocaleString('en');
  const short = credits === undefined ? '—' : compact.format(credits);
  return (
    <>
      {/* Fixed to the expanded width so it never reflows mid-animation. */}
      <div className='w-[calc(var(--sidebar-width)-1rem)] rounded-lg border border-sidebar-border bg-background p-3 group-data-[collapsible=icon]:hidden'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-xs text-muted-foreground'>Credits</span>
          <span className='text-lg font-semibold tabular-nums'>{label}</span>
        </div>
        <Link
          href='/billing'
          className='btn-brand mt-3 flex h-8 items-center justify-center rounded-md text-xs font-medium whitespace-nowrap'
        >
          Top up credits
        </Link>
      </div>
      <SidebarMenu className='hidden group-data-[collapsible=icon]:flex'>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={`${label} credits · Top up`}
            className='justify-center border border-sidebar-border bg-background text-[11px] font-semibold tabular-nums group-data-[collapsible=icon]:p-0!'
          >
            <Link href='/billing' aria-label={`${label} credits, top up`}>
              <span>{short}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
};

export const AppSidebar = ({
  pathname,
  rail,
}: {
  pathname: string;
  rail?: ReactNode;
}) => {
  const { data, isLoading } = useAccount();
  const credits = isLoading ? undefined : (data?.credits ?? 0);

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='overflow-hidden'>
        {/* The padding change centres the mark on the rail as it narrows. */}
        <div className='flex h-10 items-center pl-2 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:pl-[3px]'>
          <Logo className='shrink-0 whitespace-nowrap [&>span:last-child]:transition-opacity [&>span:last-child]:duration-200 group-data-[collapsible=icon]:[&>span:last-child]:opacity-0' />
        </div>
      </SidebarHeader>

      <SidebarContent className='overflow-x-hidden'>
        <NavGroup title='Studio' items={STUDIO_NAV} pathname={pathname} />
        <NavGroup title='Account' items={ACCOUNT_NAV} pathname={pathname} />
        {data?.role === 'ADMIN' ? (
          <NavGroup title='Internal' items={ADMIN_NAV} pathname={pathname} />
        ) : null}
      </SidebarContent>

      <SidebarFooter className='gap-3 overflow-hidden'>
        <Credits credits={credits} />
        <NavUser email={data?.email} plan={data?.plan} />
      </SidebarFooter>

      {rail}
    </Sidebar>
  );
};
