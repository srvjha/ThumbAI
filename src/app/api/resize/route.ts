import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireUser } from '@/lib/auth';
import { apiErrorResponse } from '@/utils/ApiError';

/**
 * Hosts we will fetch from. This proxy runs inside our network, so an
 * unrestricted `url` param turns it into an SSRF primitive: an attacker could
 * point it at cloud metadata endpoints or internal services and read the
 * response back as an "image".
 */
const ALLOWED_HOST_SUFFIXES = ['.fal.media', 'fal.media', '.fal.ai'];

/** Guards against a resize bomb allocating an enormous bitmap. */
const MAX_DIMENSION = 4096;

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const isAllowedSource = (raw: string): URL | null => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(suffix),
  );

  return allowed ? parsed : null;
};

export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const width = parseInt(searchParams.get('w') || '0');
    const height = parseInt(searchParams.get('h') || '0');

    if (!url || !width || !height) {
      return new Response('Invalid params', { status: 400 });
    }

    if (
      width < 1 ||
      height < 1 ||
      width > MAX_DIMENSION ||
      height > MAX_DIMENSION
    ) {
      return new Response('Requested dimensions out of range', { status: 400 });
    }

    const source = isAllowedSource(url);
    if (!source) {
      return new Response('Source host not allowed', { status: 400 });
    }

    const res = await fetch(source, { redirect: 'error' });
    if (!res.ok) {
      return new Response('Failed to fetch image', { status: 502 });
    }

    const declaredLength = Number(res.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_SOURCE_BYTES) {
      return new Response('Source image too large', { status: 413 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      return new Response('Source image too large', { status: 413 });
    }

    const resizedBuffer = await sharp(buffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg()
      .toBuffer();

    return new Response(new Uint8Array(resizedBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      return apiErrorResponse(err);
    }
    console.error('Image resize failed:', err);
    return new Response('Image resize failed', { status: 500 });
  }
}
