import { NextRequest } from 'next/server';
import { db } from '@/db';
import { requireUser } from '@/lib/auth';
import { apiErrorResponse } from '@/utils/ApiError';

const POLL_INTERVAL_MS = 2000;

/** Generations that outlive this are abandoned rather than polled forever. */
const MAX_STREAM_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return apiErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');
  if (!requestId) {
    return new Response('requestId required', { status: 400 });
  }

  // Results are private: only the owner may stream them.
  const thumbnail = await db.thumbnail.findUnique({
    where: { request_id: requestId },
    select: { user_id: true },
  });

  if (!thumbnail) {
    return new Response('Not found', { status: 404 });
  }

  if (thumbnail.user_id !== user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        while (true) {
          // The client navigated away or the connection dropped. Without this
          // the loop kept polling Postgres for a reader that no longer exists.
          if (req.signal.aborted) {
            break;
          }

          if (Date.now() - startedAt > MAX_STREAM_MS) {
            send({ status: 'TIMEOUT' });
            break;
          }

          const current = await db.thumbnail.findUnique({
            where: { request_id: requestId },
          });

          if (current?.status?.includes('COMPLETED')) {
            send({
              status: 'COMPLETED',
              image_url: current.image_url?.[0] ?? '',
            });
            break;
          }

          if (current?.status?.includes('FAILED')) {
            send({ status: 'FAILED' });
            break;
          }

          send({ status: current?.status?.[0] ?? 'PENDING' });

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      } catch (err) {
        console.error('result-stream error:', err);
        try {
          send({ status: 'FAILED' });
        } catch {
          // Connection already gone.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
