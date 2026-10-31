/**
 * Just enough user-agent parsing for the admin charts: the kind of device,
 * the browser family and the OS. Order matters throughout; Edge and Opera
 * say "Chrome", Chrome says "Safari", and iPadOS can pass for macOS.
 */

export type DeviceKind = 'desktop' | 'mobile' | 'tablet';

export interface ParsedAgent {
  device: DeviceKind;
  browser: string | null;
  os: string | null;
  bot: boolean;
}

const BOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch|go-http-client|vercel-screenshot/i;

const BROWSERS: [RegExp, string][] = [
  [/edg(e|a|ios)?\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/samsungbrowser/i, 'Samsung Internet'],
  [/brave/i, 'Brave'],
  [/vivaldi/i, 'Vivaldi'],
  [/yabrowser/i, 'Yandex'],
  [/ucbrowser/i, 'UC Browser'],
  [/firefox|fxios/i, 'Firefox'],
  [/crios|chrome|chromium/i, 'Chrome'],
  [/safari/i, 'Safari'],
];

const OSES: [RegExp, string][] = [
  [/windows nt/i, 'Windows'],
  [/iphone|ipod/i, 'iOS'],
  [/ipad/i, 'iPadOS'],
  [/android/i, 'Android'],
  [/cros/i, 'ChromeOS'],
  [/mac os x|macintosh/i, 'macOS'],
  [/linux/i, 'Linux'],
];

const first = (ua: string, table: [RegExp, string][]) =>
  table.find(([re]) => re.test(ua))?.[1] ?? null;

export const parseUserAgent = (ua: string | null | undefined): ParsedAgent => {
  const agent = ua ?? '';
  const bot = !agent || BOT.test(agent);
  const os = first(agent, OSES);

  let device: DeviceKind = 'desktop';
  if (/ipad|tablet|playbook|silk|kindle/i.test(agent)) device = 'tablet';
  else if (/android/i.test(agent) && !/mobile/i.test(agent)) device = 'tablet';
  else if (/mobi|iphone|ipod|android/i.test(agent)) device = 'mobile';

  return { device, browser: first(agent, BROWSERS), os, bot };
};

/** The registrable-ish host of a referrer, without www. Null for none. */
export const referrerDomain = (referrer: string | null | undefined) => {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host.replace(/^www\./, '').slice(0, 120) || null;
  } catch {
    return null;
  }
};
