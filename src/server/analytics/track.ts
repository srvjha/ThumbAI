import 'server-only';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { parseUserAgent, referrerDomain } from './userAgent';

export const VISITOR_COOKIE = 'tai_vid';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The cookie's visitor id when it is well formed, else a fresh one. */
export const visitorIdFrom = (cookie: string | undefined) =>
  cookie && UUID.test(cookie)
    ? { id: cookie, isNew: false }
    : { id: randomUUID(), isNew: true };

const clip = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

/** Vercel's geo headers. City arrives URL-encoded. Absent in development. */
export const geoFrom = (headers: Headers) => {
  const decode = (value: string | null) => {
    if (!value) return null;
    try {
      return decodeURIComponent(value).slice(0, 80);
    } catch {
      return value.slice(0, 80);
    }
  };
  return {
    country: decode(headers.get('x-vercel-ip-country'))?.toUpperCase() ?? null,
    region: decode(headers.get('x-vercel-ip-country-region')),
    city: decode(headers.get('x-vercel-ip-city')),
  };
};

/** A path without its query string, or null when it isn't one of ours. */
export const cleanPath = (path: unknown) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  return path.split(/[?#]/)[0].slice(0, 200);
};

/** Where a visit came from, for charts: utm_source, else referrer, else direct. */
export const sourceOf = (visitor: {
  utm_source: string | null;
  referrer_domain: string | null;
}) => visitor.utm_source ?? visitor.referrer_domain ?? 'direct';

export interface PageViewInput {
  visitorId: string;
  path: unknown;
  referrer: unknown;
  utm: { source?: unknown; medium?: unknown; campaign?: unknown } | undefined;
  headers: Headers;
  /** The local user id when the request is signed in. */
  userId: string | null;
}

/**
 * Records one page view, creating the visitor on its first. First-touch
 * fields (where they came from, location, landing page) are written once;
 * a sign-in later links the visitor, and through it the device, to the user.
 * Returns false when the request was a bot or not a page of ours.
 */
export const recordPageView = async ({
  visitorId,
  path,
  referrer,
  utm,
  headers,
  userId,
}: PageViewInput): Promise<boolean> => {
  const agent = parseUserAgent(headers.get('user-agent'));
  const cleanedPath = cleanPath(path);
  if (agent.bot || !cleanedPath) return false;

  const geo = geoFrom(headers);
  const host = headers
    .get('host')
    ?.replace(/^www\./, '')
    .split(':')[0];
  const fromDomain = referrerDomain(clip(referrer, 500));
  // Moving between our own pages is not a referral.
  const referrer_domain = fromDomain && fromDomain !== host ? fromDomain : null;
  const now = new Date();

  const visitor = await db.visitor.upsert({
    where: { id: visitorId },
    create: {
      id: visitorId,
      user_id: userId,
      ...geo,
      referrer_domain,
      utm_source: clip(utm?.source, 80)?.toLowerCase() ?? null,
      utm_medium: clip(utm?.medium, 80)?.toLowerCase() ?? null,
      utm_campaign: clip(utm?.campaign, 120),
      landing_path: cleanedPath,
      device: agent.device,
      browser: agent.browser,
      os: agent.os,
      pageviews: 1,
    },
    update: {
      last_seen_at: now,
      pageviews: { increment: 1 },
      // The latest account to use this browser owns it.
      ...(userId && { user_id: userId }),
      // A browser update changes these; keep the device current.
      device: agent.device,
      browser: agent.browser,
      os: agent.os,
    },
  });

  await db.pageView.create({
    data: { visitor_id: visitorId, user_id: userId, path: cleanedPath },
  });

  if (userId) {
    // First touch for the user: only fills fields still empty.
    await db.user.updateMany({
      where: { id: userId, acquisition_source: null },
      data: {
        country: visitor.country,
        region: visitor.region,
        city: visitor.city,
        acquisition_source: sourceOf(visitor),
      },
    });
  }
  return true;
};
