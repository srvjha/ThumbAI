import dns from 'dns/promises';
import net from 'net';

/**
 * Fetches a public web page and pulls out the bits that describe it.
 *
 * Exists because the blog workflow used to hand a bare URL to an LLM with no
 * browsing tool, so the model invented the article's content from the URL slug
 * and every cover image was generated from a guess.
 */

const FETCH_TIMEOUT_MS = 10_000;

const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** Enough for the model to understand the piece without paying for the rest. */
const MAX_TEXT_CHARS = 6000;

export interface Article {
  url: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
}

export class ArticleFetchError extends Error {}

/**
 * Rejects anything that resolves to a private or loopback address.
 *
 * Without this the fetcher is an SSRF primitive: a user-supplied URL could
 * point at cloud instance metadata or a service on the internal network, and
 * its response would come back through our own API.
 */
const assertPublicHost = async (hostname: string): Promise<void> => {
  let addresses: string[];

  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((record) => record.address);
  } catch {
    throw new ArticleFetchError('Could not resolve that host.');
  }

  if (addresses.length === 0) {
    throw new ArticleFetchError('Could not resolve that host.');
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new ArticleFetchError('That URL points to a private address.');
    }
  }
};

const isPrivateAddress = (address: string): boolean => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('fe80')) return true; // link-local
    // IPv4-mapped, e.g. ::ffff:169.254.169.254
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  return true;
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const collapse = (value: string): string =>
  decodeEntities(value).replace(/\s+/g, ' ').trim();

const matchMeta = (html: string, patterns: RegExp[]): string => {
  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found?.[1]) return collapse(found[1]);
  }
  return '';
};

export const extractArticle = (url: string, html: string): Article => {
  const title = matchMeta(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  ]);

  const description = matchMeta(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ]);

  const headings = Array.from(
    html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi),
  )
    .map((match) => collapse(match[2].replace(/<[^>]+>/g, ' ')))
    .filter((heading) => heading.length > 2 && heading.length < 160)
    .slice(0, 12);

  // Strip the parts that carry no prose before flattening the rest.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return {
    url,
    title,
    description,
    headings,
    text: collapse(body).slice(0, MAX_TEXT_CHARS),
  };
};

export const fetchArticle = async (rawUrl: string): Promise<Article> => {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ArticleFetchError('That is not a valid URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ArticleFetchError('Only http and https URLs are supported.');
  }

  await assertPublicHost(parsed.hostname);

  const response = await fetch(parsed, {
    // A redirect could land somewhere the host check never saw.
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      // Some publishers serve a challenge page to unknown agents.
      'User-Agent': 'Mozilla/5.0 (compatible; ThumbAI/1.0; +https://thumbai.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
  }).catch(() => {
    throw new ArticleFetchError('Could not reach that URL.');
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) {
      throw new ArticleFetchError('That URL redirected nowhere.');
    }
    // Re-enter so the destination is host-checked too. One hop only.
    return fetchArticleFollowingOneRedirect(new URL(location, parsed).href);
  }

  if (!response.ok) {
    throw new ArticleFetchError(
      `That URL returned ${response.status}.`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('html')) {
    throw new ArticleFetchError('That URL is not a web page.');
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_HTML_BYTES) {
    throw new ArticleFetchError('That page is too large to read.');
  }

  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw new ArticleFetchError('That page is too large to read.');
  }

  return extractArticle(parsed.href, html);
};

/** Second and final hop; refuses to redirect again. */
const fetchArticleFollowingOneRedirect = async (
  rawUrl: string,
): Promise<Article> => {
  const parsed = new URL(rawUrl);

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ArticleFetchError('Only http and https URLs are supported.');
  }

  await assertPublicHost(parsed.hostname);

  const response = await fetch(parsed, {
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ThumbAI/1.0; +https://thumbai.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
  }).catch(() => {
    throw new ArticleFetchError('Could not reach that URL.');
  });

  if (!response.ok) {
    throw new ArticleFetchError(`That URL returned ${response.status}.`);
  }

  const html = await response.text();
  return extractArticle(parsed.href, html.slice(0, MAX_HTML_BYTES));
};
