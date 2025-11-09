import { createOrder, refundOrder, verifyPayment } from '@/utils/order';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: any) {
  const slugParam = params.slug;

  // Ensure it's always an array
  const slug = Array.isArray(slugParam) ? slugParam : [slugParam];

  if (!slug || slug.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No action provided' },
      { status: 400 },
    );
  }

  const action = slug[0]; // "order", "refund", "verify"

  switch (action) {
    case 'order':
      return createOrder(req);
    case 'refund':
      return refundOrder(req);
    case 'verify':
      return verifyPayment(req);
    default:
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 404 },
      );
  }
}
