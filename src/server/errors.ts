import 'server-only';
import { NextResponse } from 'next/server';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';

/** A 429 that tells the client when to try again. */
class RateLimitError extends ApiError {
  constructor(
    message: string,
    public retryAfterSeconds: number,
  ) {
    super(message, 429);
  }
}

/**
 * Turns a thrown error into a response.
 *
 * ApiError keeps its status and message; anything else becomes a bare 500 so
 * internal failures (Prisma errors, upstream SDK errors) never leak details to
 * the caller.
 */
const apiErrorResponse = (err: unknown): NextResponse => {
  if (err instanceof ApiError) {
    return NextResponse.json(
      new ApiResponse(err.statusCode, null, err.message),
      {
        status: err.statusCode,
        headers:
          err instanceof RateLimitError
            ? { 'Retry-After': String(err.retryAfterSeconds) }
            : undefined,
      },
    );
  }

  console.error('Unhandled API error:', err);

  return NextResponse.json(
    new ApiResponse(500, null, 'Internal server error'),
    { status: 500 },
  );
};

export { ApiError, RateLimitError, apiErrorResponse };
