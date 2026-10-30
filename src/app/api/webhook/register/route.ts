import { Webhook } from 'svix';
import { NextResponse } from 'next/server';
import type {
  DeletedObjectJSON,
  UserJSON,
  WebhookEvent,
} from '@clerk/nextjs/server';
import { env } from '@/config/env';
import { ApiResponse } from '@/utils/ApiResponse';
import { apiErrorResponse } from '@/server/errors';
import { softDeleteUser, upsertUserFromClerk } from '@/server/users';

const respond = (status: number, message: string) =>
  NextResponse.json(new ApiResponse(status, null, message), { status });

/**
 * Clerk user lifecycle webhook (delivered by Svix).
 *
 * Every handler is idempotent, because Svix retries until it sees a 2xx. The
 * free signup credits are not granted here: that happens on the user's first
 * request, where their IP is known (see server/signupCredits.ts).
 */
export const POST = async (req: Request) => {
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return respond(400, 'Missing Svix headers');
  }

  // Verify the exact bytes Svix signed. Re-serialising a parsed body can
  // change them and fail the check.
  const rawBody = await req.text();

  let evt: WebhookEvent;
  try {
    evt = new Webhook(env.NEXT_CLERK_WEBHOOK_SECRET).verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return respond(400, 'Invalid signature');
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const synced = await upsertUserFromClerk(evt.data as UserJSON);
        return synced
          ? respond(200, `Processed ${evt.type}`)
          : respond(400, 'User has no primary email');
      }
      case 'user.deleted': {
        const { id } = evt.data as DeletedObjectJSON;
        if (id) await softDeleteUser(id);
        return respond(200, 'Processed user.deleted');
      }
      default:
        return respond(200, `Unhandled event type: ${evt.type}`);
    }
  } catch (err) {
    // 500 so Svix retries; every handler is safe to run again.
    return apiErrorResponse(err);
  }
};
