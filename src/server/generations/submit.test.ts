import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { getTextToImageModel } from '@/config/models';
import { submitEdit, submitGeneration } from '@/server/generations/submit';
import { createUser, creditsOf, resetDb } from '../../../test/factories';

const { submit, thumbnailPrompt, chatPrompt } = vi.hoisted(() => ({
  submit: vi.fn(),
  thumbnailPrompt: vi.fn(),
  chatPrompt: vi.fn(),
}));

vi.mock('@fal-ai/client', () => ({ fal: { queue: { submit } } }));
vi.mock('@/server/prompts/thumbnailPrompt', () => ({
  generateThumbnailPrompt: thumbnailPrompt,
}));
vi.mock('@/server/prompts/chatPrompt', () => ({
  generateChatPrompt: chatPrompt,
}));

const validPrompt = { valid_prompt: true, response: 'a crisp thumbnail' };
const draftCost = getTextToImageModel('draft').creditsPerImage;

beforeEach(async () => {
  await resetDb();
  submit.mockReset().mockResolvedValue({ request_id: 'req_1' });
  thumbnailPrompt.mockReset().mockResolvedValue(validPrompt);
  chatPrompt.mockReset().mockResolvedValue(validPrompt);
});

describe('submitGeneration', () => {
  it('charges, queues and records a generation', async () => {
    const user = await createUser({ credits: 5 });

    const result = await submitGeneration(user, {
      prompt: 'a cat',
      workflow: 'TEXT_TO_IMAGE',
    });

    expect(result).toMatchObject({ kind: 'submitted', requestId: 'req_1' });
    expect(await creditsOf(user.id)).toBe(5 - draftCost);
    expect(
      await db.thumbnail.findUnique({ where: { request_id: 'req_1' } }),
    ).toMatchObject({ user_id: user.id, model_used: 'TEXT_TO_IMAGE' });
  });

  it('rejects an unknown workflow before any paid call', async () => {
    const user = await createUser({ credits: 5 });

    await expect(
      submitGeneration(user, { prompt: 'a cat', workflow: 'NOPE' }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(thumbnailPrompt).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(await creditsOf(user.id)).toBe(5);
  });

  it('refuses a user who cannot pay before running the prompt agent', async () => {
    const user = await createUser({ credits: 0 });

    await expect(
      submitGeneration(user, { prompt: 'a cat', workflow: 'TEXT_TO_IMAGE' }),
    ).rejects.toMatchObject({ statusCode: 402 });

    expect(thumbnailPrompt).not.toHaveBeenCalled();
  });

  it('charges nothing when the agent rejects the prompt', async () => {
    const user = await createUser({ credits: 5 });
    thumbnailPrompt.mockResolvedValue({ valid_prompt: false, response: 'no' });

    const result = await submitGeneration(user, { prompt: 'asdf' });

    expect(result.kind).toBe('rejected');
    expect(submit).not.toHaveBeenCalled();
    expect(await creditsOf(user.id)).toBe(5);
  });

  it('refunds when Fal does not accept the job', async () => {
    const user = await createUser({ credits: 5 });
    submit.mockRejectedValue(new Error('fal down'));

    await expect(submitGeneration(user, { prompt: 'a cat' })).rejects.toThrow(
      'fal down',
    );
    expect(await creditsOf(user.id)).toBe(5);
  });

  it('rejects an oversized prompt', async () => {
    const user = await createUser({ credits: 5 });
    await expect(
      submitGeneration(user, { prompt: 'x'.repeat(4001) }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('submitEdit', () => {
  it('rejects reference images that are not https URLs', async () => {
    const user = await createUser({ credits: 5 });
    await expect(
      submitEdit(user, {
        mode: 'chat',
        prompt: 'brighter',
        images_urls: ['file:///etc/passwd'],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(chatPrompt).not.toHaveBeenCalled();
  });

  it('uses the chat prompt for a follow-up edit', async () => {
    const user = await createUser({ credits: 5 });

    const result = await submitEdit(user, {
      mode: 'chat',
      prompt: 'brighter',
      images_urls: ['https://fal.media/a.png'],
    });

    expect(result.kind).toBe('submitted');
    expect(chatPrompt).toHaveBeenCalledWith('brighter');
    expect(thumbnailPrompt).not.toHaveBeenCalled();
  });
});
