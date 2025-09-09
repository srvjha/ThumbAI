import { NextRequest } from "next/server";
import { db } from "@/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  if (!requestId) {
    return new Response("requestId required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let done = false;

      while (!done) {
        const thumbnail = await db.thumbnail.findUnique({
          where: { request_id: requestId },
        });

        if (thumbnail?.status === "COMPLETED") {
            console.log("complete ho gya")
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(thumbnail)}\n\n`)
          );
          done = true;
          controller.close();
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: thumbnail?.status || "PENDING" })}\n\n`
            )
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
