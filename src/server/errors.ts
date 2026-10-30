import 'server-only';
import { NextResponse } from 'next/server';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';

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
      },
    );
  }

  console.error('Unhandled API error:', err);

  return NextResponse.json(
    new ApiResponse(500, null, 'Internal server error'),
    {
      status: 500,
    },
  );
};

export { ApiError, apiErrorResponse };
