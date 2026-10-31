import { describe, expect, it } from 'vitest';
import { parseUserAgent, referrerDomain } from './userAgent';

const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

describe('parseUserAgent', () => {
  it('reads common browsers, systems and form factors', () => {
    expect(parseUserAgent(UA.chromeMac)).toEqual({
      device: 'desktop',
      browser: 'Chrome',
      os: 'macOS',
      bot: false,
    });
    expect(parseUserAgent(UA.safariIphone)).toMatchObject({
      device: 'mobile',
      browser: 'Safari',
      os: 'iOS',
    });
    expect(parseUserAgent(UA.edgeWindows)).toMatchObject({
      browser: 'Edge',
      os: 'Windows',
    });
    expect(parseUserAgent(UA.androidTablet).device).toBe('tablet');
    expect(parseUserAgent(UA.androidPhone).device).toBe('mobile');
  });

  it('treats crawlers and missing agents as bots', () => {
    expect(parseUserAgent(UA.googlebot).bot).toBe(true);
    expect(parseUserAgent('').bot).toBe(true);
  });
});

describe('referrerDomain', () => {
  it('keeps the host without www', () => {
    expect(referrerDomain('https://www.youtube.com/watch?v=1')).toBe(
      'youtube.com',
    );
    expect(referrerDomain('not a url')).toBeNull();
    expect(referrerDomain(undefined)).toBeNull();
  });
});
