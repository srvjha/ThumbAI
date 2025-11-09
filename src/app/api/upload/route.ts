import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { env } from '@/config/env';

fal.config({
  credentials: env.FAL_KEY,
});

export async function POST(req: NextRequest) {
  const file = await req.blob();
  const url = await fal.storage.upload(file);
  return NextResponse.json({ url });
}
