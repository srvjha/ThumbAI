const regionNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

/** "IN" to "India"; anything unknown passes through. */
export const countryName = (code: string | null | undefined) => {
  if (!code || code === 'Unknown') return 'Unknown';
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

/** Regional-indicator emoji for a two-letter code. */
export const countryFlag = (code: string | null | undefined) =>
  code && /^[a-z]{2}$/i.test(code)
    ? String.fromCodePoint(
        ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
      )
    : '🌐';

const number = new Intl.NumberFormat('en-IN');
export const fmt = (n: number | null | undefined) =>
  n == null ? '—' : number.format(n);

export const rupees = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n);

export const percent = (n: number | null | undefined) =>
  n == null ? '—' : `${Math.round(n * 1000) / 10}%`;

/** 850ms, 12.4s, 3m 05s. */
export const duration = (ms: number | null | undefined) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['week', 604_800_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

export const ago = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const diff = Date.parse(iso) - Date.now();
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size)
      return rtf.format(Math.round(diff / size), unit);
  }
  return 'just now';
};

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

export const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export const WORKFLOWS: Record<string, string> = {
  TEXT_TO_IMAGE: 'Text to image',
  IMAGE_TO_IMAGE: 'Image to image',
  URL_TO_IMAGE: 'Blog cover',
  UNKNOWN: 'Unknown',
};

export const CATEGORY_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt injection',
  prompt_leak: 'Prompt leak attempt',
  code_injection: 'Code injection',
  sql_injection: 'SQL injection',
  sexual: 'Sexual',
  'sexual/minors': 'Sexual (minors)',
  harassment: 'Harassment',
  'harassment/threatening': 'Threatening harassment',
  hate: 'Hate',
  'hate/threatening': 'Threatening hate',
  illicit: 'Illicit',
  'illicit/violent': 'Violent illicit',
  'self-harm': 'Self-harm',
  'self-harm/intent': 'Self-harm intent',
  'self-harm/instructions': 'Self-harm instructions',
  violence: 'Violence',
  'violence/graphic': 'Graphic violence',
};

export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;
