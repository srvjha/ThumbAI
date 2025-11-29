import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, UserJSON } from '@clerk/nextjs/server';
import { db } from '@/db';
import { NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { env } from '@/config/env';
import { Role } from '@prisma/client';

export const POST = async (req: Request): Promise<NextResponse> => {
  const WEBHOOK_SECRET = env.NEXT_CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      new ApiResponse(404, null, 'webhook secret required'),
      { status: 404 },
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      new ApiResponse(400, null, 'Error Occured - No Svix Details Found'),
      { status: 400 },
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (error: any) {
    return NextResponse.json(
      new ApiResponse(400, null, `Error verifying webhook: ${error.message}`),
      { status: 400 },
    );
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const data = evt.data as UserJSON;
    const { id, email_addresses, primary_email_address_id } = data;

    const primaryEmail = email_addresses.find(
      (email) => email.id === primary_email_address_id,
    )?.email_address;

    if (!primaryEmail || !id) {
      return NextResponse.json(
        new ApiResponse(400, null, 'Email and Clerk ID are required'),
        { status: 400 },
      );
    }

    try {
      const newUser = await db.user.create({
        data: {
          email: primaryEmail,
          clerk_id: id,
          credits: 3,
          plan: 'FREE',
          role: Role.USER,
        },
      });

      return NextResponse.json(
        new ApiResponse(201, newUser, 'User created successfully'),
        { status: 201 },
      );
    } catch (err: any) {
      return NextResponse.json(
        new ApiResponse(
          err.statusCode || 500,
          null,
          err.message || 'Server Error',
        ),
        { status: err.statusCode || 500 },
      );
    }
  }

  // ✅ Handle other event types (so we don't return undefined)
  return NextResponse.json(
    new ApiResponse(200, null, `Unhandled event type: ${eventType}`),
    { status: 200 },
  );
};
