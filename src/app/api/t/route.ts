import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { enforceRateLimit } from '@/server/rateLimit';
import { clientIp, hashIp } from '@/server/signupCredits';
import {
  VISITOR_COOKIE,
  recordPageView,
  visitorIdFrom,
} from '@/server/analytics/track';

const YEAR = 60 * 60 * 24 * 365;

/**
 * POST /api/t  { path, referrer?, utm?: { source, medium, campaign } }
 *
 * The page-view beacon. Always answers 204: analytics must never surface an
 * error to a visitor, and a client learns nothing from the outcome.
 */
export const POST = async (req: NextRequest) => {
  const visitor = visitorIdFrom(req.cookies.get(VISITOR_COOKIE)?.value);
  const res = new NextResponse(null, { status: 204 });
  if (visitor.isNew) {
    res.cookies.set(VISITOR_COOKIE, visitor.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: YEAR,
    });
  }

  try {
    await enforceRateLimit(
      'track',
      hashIp(clientIp(req.headers)) ?? visitor.id,
    );

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return res;

    const { userId: clerkId } = await auth();
    const user = clerkId
      ? await db.user.findUnique({
          where: { clerk_id: clerkId },
          select: { id: true },
        })
      : null;

    await recordPageView({
      visitorId: visitor.id,
      path: body.path,
      referrer: body.referrer,
      utm: body.utm,
      headers: req.headers,
      userId: user?.id ?? null,
    });
  } catch (err) {
    // Over the limit or a write failed: drop the view quietly.
    if (!(err instanceof Error && 'statusCode' in err)) {
      console.error('[track] page view not recorded', err);
    }
  }
  return res;
};
