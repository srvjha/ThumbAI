import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    AI_GATEWAY_API_KEY: z.string(),
    OPENAI_API_KEY: z.string(),
    GEMINI_API_KEY: z.string(),
    FAL_KEY: z.string(),
    CLERK_SECRET_KEY: z.string(),
    DATABASE_URL: z.string().url(),
    NEXT_CLERK_WEBHOOK_SECRET: z.string(),
    RAZORPAY_KEY_SECRET: z.string(),
    RAZORPAY_WEBHOOK_SECRET: z.string(),
    // Upstash Redis, for throttling and rate limits. Optional so the app
    // still runs before the Vercel integration is added; see server/redis.ts.
    // The Vercel Marketplace integration names them KV_REST_API_*.
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    KV_REST_API_URL: z.string().url().optional(),
    KV_REST_API_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string(),
    NEXT_PUBLIC_FAL_WEBHOOK_URL: z.string().url(),
  },
  runtimeEnv: {
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FAL_KEY: process.env.FAL_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_CLERK_WEBHOOK_SECRET: process.env.NEXT_CLERK_WEBHOOK_SECRET,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,

    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_FAL_WEBHOOK_URL: process.env.NEXT_PUBLIC_FAL_WEBHOOK_URL,
  },
});
