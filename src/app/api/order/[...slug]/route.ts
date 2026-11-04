import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/server/auth';
import { ApiError, apiErrorResponse } from '@/server/errors';
import {
  cancelOrder,
  createCheckoutForPlan,
  refundPayment,
  verifyCheckout,
} from '@/server/payments';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  try {
    const [action] = (await params).slug ?? [];

    switch (action) {
      case 'order': {
        const user = await requireUser();
        const { productId } = await req.json();
        const { orderId, checkoutUrl } = await createCheckoutForPlan(
          user,
          productId,
          req.nextUrl.origin,
        );
        return NextResponse.json({
          success: true,
          orderId,
          checkoutUrl,
          message: 'Checkout created',
        });
      }
      case 'verify': {
        const user = await requireUser();
        const result = await verifyCheckout(user.id, await req.json());
        return NextResponse.json(result);
      }
      case 'cancel': {
        const user = await requireUser();
        const { orderId } = await req.json();
        await cancelOrder(user.id, orderId);
        return NextResponse.json({
          success: true,
          message: 'Order marked as cancelled',
        });
      }
      case 'refund': {
        // Refunds move money out. Admin only.
        await requireAdmin();
        const { paymentId } = await req.json();
        const data = await refundPayment(paymentId);
        return NextResponse.json({
          success: true,
          message: 'Successfully refunded',
          data,
        });
      }
      default:
        throw new ApiError('Invalid action', 404);
    }
  } catch (err) {
    return apiErrorResponse(err);
  }
}
