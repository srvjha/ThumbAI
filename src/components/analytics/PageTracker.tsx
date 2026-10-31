'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Admins browsing the panel are not traffic.
const IGNORED = /^\/(admin|api)(\/|$)/;

/**
 * Sends one page view per route change to /api/t, our own first-party
 * counter. Renders nothing. The server keeps the referrer and UTM tags only
 * from a browser's first visit, so later sends repeating them do no harm.
 */
export const PageTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || IGNORED.test(pathname)) return;
    const params = new URLSearchParams(window.location.search);
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || undefined,
      utm: {
        source: params.get('utm_source') ?? undefined,
        medium: params.get('utm_medium') ?? undefined,
        campaign: params.get('utm_campaign') ?? undefined,
      },
    });
    fetch('/api/t', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }, [pathname]);

  return null;
};
