import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Prompt evals: call the real prompt models (not Fal) and write what each
 * case would send to the image model. Run with `pnpm eval:prompts`.
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
    include: ['tools/evals/**/*.eval.ts'],
    testTimeout: 120_000,
  },
});
