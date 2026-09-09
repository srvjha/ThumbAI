import crypto from 'crypto';

/**
 * Verification for Fal's queue webhooks.
 *
 * Fal signs each delivery with ED25519. Without checking that signature the
 * webhook is an unauthenticated write endpoint: anyone who learns a request id
 * could mark a generation complete and attach image URLs of their choosing.
 *
 * See https://fal.ai/docs/model-endpoints/webhooks
 */

const JWKS_URL = 'https://rest.fal.ai/.well-known/jwks.json';

/** Fal's guidance: allow +/-5 minutes for clock skew. */
const TIMESTAMP_LEEWAY_SECONDS = 300;

const JWKS_TTL_MS = 24 * 60 * 60 * 1000;

interface Jwk {
  kty: string;
  crv: string;
  x: string;
}

let jwksCache: { keys: crypto.KeyObject[]; fetchedAt: number } | null = null;

const fetchPublicKeys = async (): Promise<crypto.KeyObject[]> => {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Fal JWKS: ${res.status}`);
  }

  const body = (await res.json()) as { keys?: Jwk[] };

  const keys = (body.keys ?? [])
    .filter((jwk) => jwk.kty === 'OKP' && jwk.crv === 'Ed25519')
    .flatMap((jwk) => {
      try {
        return [
          crypto.createPublicKey({
            key: { kty: 'OKP', crv: 'Ed25519', x: jwk.x } as any,
            format: 'jwk',
          }),
        ];
      } catch {
        return [];
      }
    });

  if (keys.length === 0) {
    throw new Error('Fal JWKS contained no usable ED25519 keys');
  }

  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
};

export interface FalWebhookHeaders {
  requestId: string | null;
  userId: string | null;
  timestamp: string | null;
  signature: string | null;
}

export const readFalWebhookHeaders = (
  headers: Headers,
): FalWebhookHeaders => ({
  requestId: headers.get('x-fal-webhook-request-id'),
  userId: headers.get('x-fal-webhook-user-id'),
  timestamp: headers.get('x-fal-webhook-timestamp'),
  signature: headers.get('x-fal-webhook-signature'),
});

/**
 * Returns true only when the raw body genuinely came from Fal.
 *
 * Fails closed: any missing header, stale timestamp, malformed signature, or
 * JWKS fetch failure is a rejection.
 */
export const verifyFalWebhook = async (
  headers: FalWebhookHeaders,
  rawBody: string,
): Promise<boolean> => {
  const { requestId, userId, timestamp, signature } = headers;

  if (!requestId || !userId || !timestamp || !signature) {
    return false;
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) {
    return false;
  }

  const skew = Math.abs(Date.now() / 1000 - sentAt);
  if (skew > TIMESTAMP_LEEWAY_SECONDS) {
    console.error('Fal webhook rejected: timestamp outside leeway', { skew });
    return false;
  }

  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(signature, 'hex');
    if (signatureBytes.length === 0) return false;
  } catch {
    return false;
  }

  // message = requestId \n userId \n timestamp \n sha256(body) as hex
  const bodyHash = crypto
    .createHash('sha256')
    .update(rawBody, 'utf8')
    .digest('hex');

  const message = Buffer.from(
    [requestId, userId, timestamp, bodyHash].join('\n'),
    'utf8',
  );

  try {
    const keys = await fetchPublicKeys();
    return keys.some((key) =>
      crypto.verify(null, message, key, signatureBytes),
    );
  } catch (err) {
    console.error('Fal webhook verification failed:', err);
    return false;
  }
};
