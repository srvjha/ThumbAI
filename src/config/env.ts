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
    // Dodo Payments. Optional so a deploy without them still boots; checkout
    // answers 503 until they are set.
    DODO_PAYMENTS_API_KEY: z.string().optional(),
    DODO_PAYMENTS_WEBHOOK_KEY: z.string().optional(),
    DODO_PAYMENTS_ENVIRONMENT: z
      .enum(['test_mode', 'live_mode'])
      .default('test_mode'),
    DODO_PRODUCT_CREATOR_PRO: z.string().optional(),
    DODO_PRODUCT_BUSINESS_ELITE: z.string().optional(),
    // Keys the hash of signup IPs. Optional so deploys don't fail before it
    // is set; without it the per-IP signup limit is off.
    SIGNUP_IP_SALT: z.string().min(16).optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
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
    DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_WEBHOOK_KEY: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    DODO_PAYMENTS_ENVIRONMENT: process.env.DODO_PAYMENTS_ENVIRONMENT,
    DODO_PRODUCT_CREATOR_PRO: process.env.DODO_PRODUCT_CREATOR_PRO,
    DODO_PRODUCT_BUSINESS_ELITE: process.env.DODO_PRODUCT_BUSINESS_ELITE,
    SIGNUP_IP_SALT: process.env.SIGNUP_IP_SALT,

    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_FAL_WEBHOOK_URL: process.env.NEXT_PUBLIC_FAL_WEBHOOK_URL,
  },
});
