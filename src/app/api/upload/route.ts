import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { env } from '@/config/env';
import { requireUser } from '@/lib/auth';
import { ApiError, apiErrorResponse } from '@/utils/ApiError';

fal.config({
  credentials: env.FAL_KEY,
});

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Server-side proxy for Fal storage uploads.
 *
 * The browser must never hold FAL_KEY, so every upload is relayed here. That
 * makes this endpoint the perimeter: it is authenticated and bounded, or it
 * becomes free hosting billed to our Fal account.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ApiError('No file provided', 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new ApiError(
        `Unsupported file type. Allowed: ${[...ALLOWED_TYPES].join(', ')}`,
        415,
      );
    }

    if (file.size === 0) {
      throw new ApiError('File is empty', 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError('File exceeds the 10MB limit', 413);
    }

    const url = await fal.storage.upload(file);

    return NextResponse.json({ url });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
