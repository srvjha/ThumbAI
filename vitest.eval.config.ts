import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Prompt evals: call the real prompt models (not Fal) and write what each
 * case would send to the image model. `pnpm eval:prompts` runs the
 * hand-written cases, `pnpm eval:production` real requests plus a synthetic
 * spread, `pnpm eval:checks` the eval's own unit tests (no API calls).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tools/evals/**/*.eval.ts', 'tools/evals/**/*.test.ts'],
    testTimeout: 120_000,
    // The production eval runs a few hundred model calls.
    hookTimeout: 120_000,
  },
});
