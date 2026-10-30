import 'server-only';
import { cookies } from 'next/headers';
import {
  SIDEBAR_STATE_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
  parseSidebarWidth,
} from './sidebar-config';

/**
 * Initial sidebar state for a layout. The route picks the fallback
 * (studio starts collapsed); the user's saved cookie always wins.
 */
export const getSidebarDefaults = async (fallbackOpen: boolean) => {
  const jar = await cookies();
  const saved = jar.get(SIDEBAR_STATE_COOKIE)?.value;
  return {
    defaultOpen: saved === undefined ? fallbackOpen : saved === 'true',
    defaultWidth: parseSidebarWidth(jar.get(SIDEBAR_WIDTH_COOKIE)?.value),
  };
};
