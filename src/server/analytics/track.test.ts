import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { recordPageView, visitorIdFrom } from '@/server/analytics/track';
import { createUser, resetDb } from '../../../test/factories';

beforeEach(resetDb);

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const headers = (extra: Record<string, string> = {}) =>
  new Headers({
    'user-agent': CHROME_MAC,
    host: 'thumbai.srvjha.in',
    'x-vercel-ip-country': 'in',
    'x-vercel-ip-country-region': 'KA',
    'x-vercel-ip-city': 'Bengaluru%20Urban',
    ...extra,
  });

const view = (visitorId: string, overrides: Record<string, unknown> = {}) =>
  recordPageView({
    visitorId,
    path: '/pricing?ref=x',
    referrer: 'https://www.youtube.com/watch?v=1',
    utm: undefined,
    headers: headers(),
    userId: null,
    ...overrides,
  });

describe('recordPageView', () => {
  it('keeps first-touch details and counts later views', async () => {
    const id = randomUUID();
    await view(id);
    await view(id, {
      path: '/studio',
      referrer: 'https://google.com/',
      utm: { source: 'Twitter' },
    });

    const visitor = await db.visitor.findUniqueOrThrow({ where: { id } });
    expect(visitor).toMatchObject({
      country: 'IN',
      region: 'KA',
      city: 'Bengaluru Urban',
      referrer_domain: 'youtube.com',
      utm_source: null,
      landing_path: '/pricing',
      device: 'desktop',
      browser: 'Chrome',
      os: 'macOS',
      pageviews: 2,
    });
    expect(await db.pageView.count({ where: { visitor_id: id } })).toBe(2);
  });

  it('ignores bots, foreign paths and self-referrals', async () => {
    const id = randomUUID();
    expect(
      await view(id, { headers: headers({ 'user-agent': 'Googlebot/2.1' }) }),
    ).toBe(false);
    expect(await view(id, { path: 'https://evil.test/' })).toBe(false);
    await view(id, { referrer: 'https://thumbai.srvjha.in/' });
    expect(
      (await db.visitor.findUniqueOrThrow({ where: { id } })).referrer_domain,
    ).toBeNull();
  });

  it('links the device to the user and fills their first touch once', async () => {
    const user = await createUser();
    const id = randomUUID();
    await view(id, { userId: user.id });
    await view(randomUUID(), {
      userId: user.id,
      headers: headers({ 'x-vercel-ip-country': 'US' }),
      referrer: 'https://reddit.com/',
    });

    expect(
      await db.user.findUniqueOrThrow({ where: { id: user.id } }),
    ).toMatchObject({
      country: 'IN',
      acquisition_source: 'youtube.com',
    });
    expect(await db.visitor.count({ where: { user_id: user.id } })).toBe(2);
  });
});

describe('visitorIdFrom', () => {
  it('reuses a valid cookie and replaces a forged one', () => {
    const id = randomUUID();
    expect(visitorIdFrom(id)).toEqual({ id, isNew: false });
    expect(visitorIdFrom("x' OR 1=1").isNew).toBe(true);
    expect(visitorIdFrom(undefined).isNew).toBe(true);
  });
});
