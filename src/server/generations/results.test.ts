import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GEN_STATUS } from '@prisma/client';
import { db } from '@/db';
import { EDIT_MODEL } from '@/config/models';
import { chargeGeneration } from '@/server/credits';
import {
  markGenerationFailed,
  reconcileStaleGenerations,
  storeGenerationResult,
} from '@/server/generations/results';
import {
  createGeneration,
  createUser,
  creditsOf,
  expectLedgerBalanced,
  resetDb,
} from '../../../test/factories';

vi.mock('@fal-ai/client', () => ({ fal: { queue: {} } }));

beforeEach(resetDb);

describe('markGenerationFailed', () => {
  it('refunds exactly what was charged', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await chargeGeneration(user.id, gen.id, 3);

    await markGenerationFailed({ request_id: gen.request_id! });

    expect(await creditsOf(user.id)).toBe(5);
    const saved = await db.thumbnail.findUniqueOrThrow({
      where: { id: gen.id },
    });
    expect(saved.status).toBe(GEN_STATUS.FAILED);
    await expectLedgerBalanced(user.id);
  });

  it('refunds a pre-ledger generation at its endpoint price', async () => {
    const user = await createUser({ credits: 0 });
    const gen = await createGeneration(user.id, { numImages: 2 });

    await markGenerationFailed({ id: gen.id });

    expect(await creditsOf(user.id)).toBe(2 * EDIT_MODEL.creditsPerImage);
  });

  it('refunds once when several paths fail the same job concurrently', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await chargeGeneration(user.id, gen.id, 2);

    await Promise.all([
      markGenerationFailed({ request_id: gen.request_id! }),
      markGenerationFailed({ request_id: gen.request_id! }),
      markGenerationFailed({ id: gen.id }),
    ]);

    expect(await creditsOf(user.id)).toBe(5);
    await expectLedgerBalanced(user.id);
  });

  it('never refunds a completed generation', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await chargeGeneration(user.id, gen.id, 2);
    await storeGenerationResult(gen.request_id!, ['https://fal.media/a.png']);

    await markGenerationFailed({ request_id: gen.request_id! });

    expect(await creditsOf(user.id)).toBe(3);
  });
});

describe('storeGenerationResult', () => {
  it('does not complete a generation that was already failed and refunded', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await createGeneration(user.id);
    await chargeGeneration(user.id, gen.id, 2);
    await markGenerationFailed({ id: gen.id });

    await storeGenerationResult(gen.request_id!, [
      'https://fal.media/late.png',
    ]);

    const saved = await db.thumbnail.findUniqueOrThrow({
      where: { id: gen.id },
    });
    expect(saved.status).toBe(GEN_STATUS.FAILED);
    expect(saved.image_url).toEqual([]);
    expect(await creditsOf(user.id)).toBe(5);
  });
});

describe('reconcileStaleGenerations', () => {
  it('fails and refunds a row whose submit never reached Fal', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await db.thumbnail.create({
      data: {
        user_id: user.id,
        num_of_images: 1,
        image_url: [],
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });
    await chargeGeneration(user.id, gen.id, 2);

    await reconcileStaleGenerations(user.id);

    const saved = await db.thumbnail.findUniqueOrThrow({
      where: { id: gen.id },
    });
    expect(saved.status).toBe(GEN_STATUS.FAILED);
    expect(await creditsOf(user.id)).toBe(5);
    await expectLedgerBalanced(user.id);
  });

  it('leaves a fresh row alone', async () => {
    const user = await createUser({ credits: 5 });
    const gen = await db.thumbnail.create({
      data: { user_id: user.id, num_of_images: 1, image_url: [] },
    });

    await reconcileStaleGenerations(user.id);

    const saved = await db.thumbnail.findUniqueOrThrow({
      where: { id: gen.id },
    });
    expect(saved.status).toBe(GEN_STATUS.PENDING);
  });
});
