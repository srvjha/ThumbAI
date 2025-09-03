import { createOrder, refundOrder, verifyPayment } from "@/utils/order";
import { NextRequest, NextResponse } from "next/server";


export const POST = async (
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) => {
  const { slug } = await context.params; 

  if (!slug || slug.length === 0) {
    return NextResponse.json(
      { success: false, message: "No action provided" },
      { status: 400 }
    );
  }

  const action = slug[0]; // "order", "refund", "verify"

  switch (action) {
    case "order":
      return createOrder(req);
    case "refund":
      return refundOrder(req);
    case "verify":
      return verifyPayment(req);
    default:
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 404 }
      );
  }
};
