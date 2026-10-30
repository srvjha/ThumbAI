import { NextResponse } from 'next/server';
import { db } from '@/db';
import { requireUser } from '@/server/auth';
import { apiErrorResponse } from '@/server/errors';
import { ApiResponse } from '@/utils/ApiResponse';

/**
 * The signed-in user's purchase history, newest first.
 *
 * Scoped by the session's user id, never by anything in the request, so one
 * user can never list another's orders. Razorpay ids and signatures stay
 * server-side; the billing page only needs what it displays.
 */
export const GET = async () => {
  try {
    const user = await requireUser();

    const orders = await db.order.findMany({
      where: { user_id: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        productName: true,
        amount: true,
        credits: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      new ApiResponse(200, orders, 'Orders fetched successfully'),
      { status: 200 },
    );
  } catch (err) {
    return apiErrorResponse(err);
  }
};
