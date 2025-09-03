import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent, UserJSON } from "@clerk/nextjs/server";
import { ApiError } from "@/utils/ApiError";
import { db } from "@/db";
import { NextResponse } from "next/server";
import { ApiResponse } from "@/utils/ApiResponse";

export const POST = async (req: Request) => {
  const WEBHOOK_SECRET = process.env.NEXT_CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new ApiError("webhook secret required", 404);
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new ApiError("Error Occured - No Svix Details Found", 400);
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error: any) {
    console.error("Error verifying webhook", error.message);
    throw new ApiError(`Error verifying webhook: ${error.message}`, 400);
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const data = evt.data as UserJSON; // 👈 Narrow type to UserJSON
    const { id, email_addresses, primary_email_address_id } = data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === primary_email_address_id
    )?.email_address;

    try {
      if (!primaryEmail || !id) {
        throw new ApiError("Email and Clerk ID are required", 400);
      }

      const newUser = await db.user.create({
        data: {
          email: primaryEmail,
          clerk_id: id,
          credits: 7,
          plan: "FREE",
        },
      });

      return NextResponse.json(
        new ApiResponse(201, newUser, "User created successfully"),
        { status: 201 }
      );
    } catch (err: any) {
      return NextResponse.json(
        new ApiResponse(
          err.statusCode || 500,
          null,
          err.message || "Server Error"
        ),
        { status: err.statusCode || 500 }
      );
    }
  }
};
