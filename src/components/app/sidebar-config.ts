// Shared by the server layouts (cookie read) and the client shell.

/** Written by shadcn's SidebarProvider on every explicit toggle. */
export const SIDEBAR_STATE_COOKIE = 'sidebar_state';
/** Expanded width in px, written when a rail drag ends. */
export const SIDEBAR_WIDTH_COOKIE = 'sidebar_width';
export const SIDEBAR_WIDTH_STORAGE_KEY = 'thumbai.sidebar-width';

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 320;
export const SIDEBAR_DEFAULT_WIDTH = 240;
/** Must match --sidebar-width-icon in ui/sidebar.tsx (3rem). */
export const SIDEBAR_ICON_WIDTH = 48;
/** Releasing (or dragging) narrower than this collapses to the icon rail. */
export const SIDEBAR_SNAP_WIDTH = 120;

export const clampSidebarWidth = (px: number) =>
  Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, px)));

/** Parses a stored width; anything missing or malformed gives undefined. */
export const parseSidebarWidth = (raw: string | null | undefined) => {
  const n = Number(raw);
  return raw && Number.isFinite(n) ? clampSidebarWidth(n) : undefined;
};
