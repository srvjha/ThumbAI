import {
  cancelOrder,
  createOrder,
  refundOrder,
  verifyPayment,
} from '@/utils/order';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: any) {
  const { slug } = await context.params;
  const normalizedSlug = Array.isArray(slug) ? slug : [slug];

  if (!normalizedSlug || normalizedSlug.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No action provided' },
      { status: 400 },
    );
  }

  const action = normalizedSlug[0]; // "order", "refund", "verify"

  switch (action) {
    case 'order':
      return createOrder(req);
    case 'refund':
      return refundOrder(req);
    case 'verify':
      return verifyPayment(req);
    case 'cancel':
      return cancelOrder(req);
    default:
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 404 },
      );
  }
}
