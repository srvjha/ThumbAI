import { NextResponse } from 'next/server';
import { ApiResponse } from './ApiResponse';

class ApiError extends Error {
  data: any;
  success: boolean;
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.data = null;
    this.success = false;
    this.name = new.target.name;
    Error.captureStackTrace(this, this.constructor);
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
    return NextResponse.json(new ApiResponse(err.statusCode, null, err.message), {
      status: err.statusCode,
    });
  }

  console.error('Unhandled API error:', err);

  return NextResponse.json(new ApiResponse(500, null, 'Internal server error'), {
    status: 500,
  });
};

export { ApiError, apiErrorResponse };
