import { NextRequest } from "next/server";
import sharp from "sharp";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const width = parseInt(searchParams.get("w") || "0");
  const height = parseInt(searchParams.get("h") || "0");

  if (!url || !width || !height) {
    return new Response("Invalid params", { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response("Failed to fetch image", { status: 500 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const resizedBuffer = await sharp(buffer)
      .resize(width, height, { fit: "cover" })
      .toBuffer();

    // ✅ Convert Node Buffer → Uint8Array
    return new Response(new Uint8Array(resizedBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response("Image resize failed", { status: 500 });
  }
}
