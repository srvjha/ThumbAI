'use client';

import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Kbd } from '@/components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ACCOUNT_NAV,
  AppSidebar,
  STUDIO_NAV,
  isNavActive,
} from './AppSidebar';
import { SidebarResizeRail } from './SidebarResizeRail';
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_WIDTH_COOKIE,
  SIDEBAR_WIDTH_STORAGE_KEY,
  parseSidebarWidth,
} from './sidebar-config';

/** Routes that render inside the app shell instead of the marketing header. */
export const APP_ROUTE_PREFIXES = ['/studio', '/dashboard', '/billing'];

const ALL_NAV = [...STUDIO_NAV, ...ACCOUNT_NAV];

// ⌘ on Apple platforms, Ctrl elsewhere; the server renders ⌘.
const noop = () => () => {};
const useModKey = () =>
  useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'),
    () => '⌘',
  );

const TopBar = ({ pathname }: { pathname: string }) => {
  const mod = useModKey();
  const current = ALL_NAV.find((item) => isNavActive(item.href, pathname));
  return (
    <header className='sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4'>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className='-ml-1 text-muted-foreground hover:text-foreground' />
        </TooltipTrigger>
        <TooltipContent side='bottom' className='flex items-center gap-2'>
          Toggle sidebar <Kbd>{mod}B</Kbd>
        </TooltipContent>
      </Tooltip>
      {current ? (
        <>
          <Separator orientation='vertical' className='mr-1 h-4!' />
          <span className='truncate text-sm font-medium'>{current.label}</span>
        </>
      ) : null}
    </header>
  );
};

const saveWidth = (px: number) => {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(px));
  } catch {
    // storage blocked; the cookie below still carries it
  }
  document.cookie = `${SIDEBAR_WIDTH_COOKIE}=${px}; path=/; max-age=31536000; samesite=lax`;
};

/**
 * Frame for every signed-in screen: shadcn's collapsible icon sidebar
 * (a Sheet on mobile) with a resizable rail. Pages supply their own
 * heading via <AppPageHeader>.
 *
 * defaultOpen / defaultWidth come from the layout's cookie read
 * (getSidebarDefaults) so the first paint matches the saved state.
 */
export const AppShell = ({
  children,
  defaultOpen = true,
  defaultWidth,
  fullBleed = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultWidth?: number;
  fullBleed?: boolean;
}) => {
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth ?? SIDEBAR_DEFAULT_WIDTH);

  // No cookie yet: fall back to a width saved in this browser.
  useEffect(() => {
    if (defaultWidth !== undefined) return;
    try {
      const stored = parseSidebarWidth(
        localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY),
      );
      if (stored !== undefined) setWidth(stored);
    } catch {
      // storage blocked; keep the default
    }
  }, [defaultWidth]);

  const onResizeEnd = useCallback((px: number) => {
    setWidth(px);
    saveWidth(px);
  }, []);

  return (
    <SidebarProvider
      ref={wrapperRef}
      defaultOpen={defaultOpen}
      style={{ '--sidebar-width': `${width}px` } as CSSProperties}
      // While dragging, width tracks the pointer with no transition.
      className='[&[data-resizing=true]_[data-slot=sidebar-container]]:transition-none [&[data-resizing=true]_[data-slot=sidebar-gap]]:transition-none'
    >
      <AppSidebar
        pathname={pathname}
        rail={
          <SidebarResizeRail
            wrapperRef={wrapperRef}
            width={width}
            onResizeEnd={onResizeEnd}
          />
        }
      />
      <SidebarInset className='min-w-0'>
        <TopBar pathname={pathname} />
        {/* The studio canvas manages its own padding and fills the inset. */}
        {fullBleed ? (
          <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
        ) : (
          <div className='mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8'>
            {children}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
};

export const AppPageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-8'>
    <div>
      <h1 className='font-serif text-3xl tracking-tight sm:text-4xl'>
        {title}
      </h1>
      {description && (
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      )}
    </div>
    {actions && <div className='flex items-center gap-2'>{actions}</div>}
  </div>
);
