import 'server-only';

/**
 * Hosts we will fetch from. This proxy runs inside our network, so an
 * unrestricted `url` param turns it into an SSRF primitive: an attacker could
 * point it at cloud metadata endpoints or internal services and read the
 * response back as an "image".
 */
const ALLOWED_HOSTS = ['fal.media', 'fal.ai'];

export const isAllowedSource = (raw: string): URL | null => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  // The exact host or a true subdomain of it. A bare endsWith('fal.media')
  // also admitted evilfal.media, which an attacker can point at any address.
  const allowed = ALLOWED_HOSTS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );

  return allowed ? parsed : null;
};
