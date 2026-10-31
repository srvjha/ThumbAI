import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { ApiError, apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';
import { requireAdmin } from '@/server/auth';

type Params = Record<string, string>;

/**
 * Wraps an admin API handler: checks the caller is an admin, hands over the
 * route params and (for writes) the JSON body, and shapes the response.
 */
export const adminRoute =
  <P extends Params = Params>(
    handler: (ctx: {
      req: NextRequest;
      admin: User;
      params: P;
      body: Record<string, unknown>;
    }) => Promise<unknown>,
    message = 'OK',
  ) =>
  async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const admin = await requireAdmin();
      const params = context?.params ? await context.params : ({} as P);
      const body =
        req.method === 'GET'
          ? {}
          : await req.json().catch(() => {
              throw new ApiError('Invalid JSON body', 400);
            });
      const data = await handler({ req, admin, params, body: body ?? {} });
      return NextResponse.json(new ApiResponse(200, data, message), {
        status: 200,
      });
    } catch (err) {
      return apiErrorResponse(err);
    }
  };
