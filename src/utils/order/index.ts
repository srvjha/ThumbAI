import { db } from "@/db";
import { razorpay } from "@/config/razorpay";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

export const createOrder = async (req: NextRequest) => {
  try {
    const { productId, productName, amount } = await req.json();
    if (!productId || !amount) {
      return NextResponse.json(
        { success: false, message: "Product ID and amount are required" },
        { status: 400 },
      );
    }

    const receiptNo = `receipt_${Date.now()}`;

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: receiptNo,
      payment_capture: true,
    });

    // Save order in DB
    const order = await db.order.create({
      data: {
        productId,
        productName,
        amount,
        currency: "INR",
        razorpayOrderId: razorpayOrder.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        order,
        message: "Order created successfully",
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create order",
        error: error.message,
      },
      { status: 500 },
    );
  }
};

export const refundOrder = async (req: NextRequest) => {
  try {
    const { paymentId, amount } = await req.json();

    if (!paymentId || !amount) {
      return NextResponse.json(
        { success: false, message: "Payment ID and amount are required" },
        { status: 400 },
      );
    }
    const razorpayResponse = await razorpay.payments.refund(paymentId, {
      amount: parseInt(amount), // amount in paise
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully refunded",
        data: razorpayResponse,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to issue refund",
        error: error?.error?.description || error.message,
      },
      { status: 500 },
    );
  }
};

export const verifyPayment = async (req: NextRequest) => {
  try {
    const { orderId, paymentId, signature } = await req.json();

    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET as string)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature === signature) {
      // console.log("✅ Payment verified");

      // Update order in DB
      await db.order.update({
        where: { razorpayOrderId: orderId },
        data: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          status: "paid",
        },
      });

      return NextResponse.json({ status: "success" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
};
