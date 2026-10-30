import { randomUUID } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GEN_STATUS } from '@prisma/client';
import { db } from '@/db';
import { EDIT_MODEL } from '@/config/models';
import {
  markGenerationFailed,
  storeGenerationResult,
} from '@/server/generations/results';
import { createUser, creditsOf, resetDb } from '../../../test/factories';

vi.mock('@fal-ai/client', () => ({ fal: { queue: {} } }));

const createGeneration = (userId: string, numImages = 2) =>
  db.thumbnail.create({
    data: {
      request_id: `req_${randomUUID()}`,
      user_id: userId,
      num_of_images: numImages,
      image_url: [],
      model_endpoint: EDIT_MODEL.endpointId,
    },
  });

beforeEach(resetDb);

describe('markGenerationFailed', () => {
  it('refunds what the endpoint charged per image', async () => {
    const user = await createUser({ credits: 0 });
    const gen = await createGeneration(user.id, 2);

    await markGenerationFailed(gen.request_id);

    expect(await creditsOf(user.id)).toBe(2 * EDIT_MODEL.creditsPerImage);
    const saved = await db.thumbnail.findUniqueOrThrow({
      where: { id: gen.id },
    });
    expect(saved.status).toBe(GEN_STATUS.FAILED);
  });

  it('refunds once when two paths fail the same job concurrently', async () => {
    const user = await createUser({ credits: 0 });
    const gen = await createGeneration(user.id, 1);

    await Promise.all([
      markGenerationFailed(gen.request_id),
      markGenerationFailed(gen.request_id),
      markGenerationFailed(gen.request_id),
    ]);

    expect(await creditsOf(user.id)).toBe(EDIT_MODEL.creditsPerImage);
  });

  it('never refunds a completed generation', async () => {
    const user = await createUser({ credits: 0 });
    const gen = await createGeneration(user.id);
    await storeGenerationResult(gen.request_id, ['https://fal.media/a.png']);

    await markGenerationFailed(gen.request_id);

    expect(await creditsOf(user.id)).toBe(0);
  });
});
