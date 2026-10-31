import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import {
  EDIT_MODEL,
  PHOTO_MODEL,
  getTextToImageModel,
} from '@/config/models';
import { submitEdit, submitGeneration } from '@/server/generations/submit';
import { EDIT_SYSTEM_PROMPT } from '@/server/prompts/imageRules';
import {
  createUser,
  creditsOf,
  expectLedgerBalanced,
  resetDb,
} from '../../../test/factories';

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

    expect(result).toMatchObject({
      kind: 'submitted',
      requestId: 'req_1',
      reply: null,
      archetype: null,
      modelName: getTextToImageModel('draft').modelName,
    });
    if (result.kind !== 'submitted') throw new Error('unreachable');
    expect(await creditsOf(user.id)).toBe(5 - draftCost);
    const gen = await db.thumbnail.findUniqueOrThrow({
      where: { request_id: 'req_1' },
      include: { CreditTransaction: true },
    });
    expect(gen).toMatchObject({
      user_id: user.id,
      model_used: 'TEXT_TO_IMAGE',
    });
    expect(gen.CreditTransaction).toMatchObject([
      { type: 'GENERATION_CHARGE', amount: -draftCost },
    ]);
    await expectLedgerBalanced(user.id);
  });

  it("returns the writer's reply and the design's label", async () => {
    const user = await createUser({ credits: 5 });
    thumbnailPrompt.mockResolvedValue({
      ...validPrompt,
      reply: 'I went with a bold red headline.',
      archetypeLabel: 'Coding / dev',
    });

    const result = await submitGeneration(user, {
      prompt: 'build a CDN',
      workflow: 'TEXT_TO_IMAGE',
      tier: 'quality',
    });

    expect(result).toMatchObject({
      kind: 'submitted',
      reply: 'I went with a bold red headline.',
      archetype: 'Coding / dev',
      modelName: 'Nano Banana Pro',
    });
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

  it('leaves no generation behind when the atomic charge loses a race', async () => {
    // Passes the early balance check (stale user object), then the charge
    // finds the credits already gone.
    const user = await createUser({ credits: 5 });
    await db.user.update({ where: { id: user.id }, data: { credits: 0 } });

    await expect(
      submitGeneration(user, { prompt: 'a cat' }),
    ).rejects.toMatchObject({ statusCode: 402 });

    expect(submit).not.toHaveBeenCalled();
    expect(await db.thumbnail.count()).toBe(0);
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
    const gen = await db.thumbnail.findFirstOrThrow({
      include: { CreditTransaction: true },
    });
    expect(gen.status).toBe('FAILED');
    expect(gen.CreditTransaction.map((t) => t.type).sort()).toEqual([
      'GENERATION_CHARGE',
      'GENERATION_REFUND',
    ]);
    await expectLedgerBalanced(user.id);
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
    chatPrompt.mockResolvedValue({
      ...validPrompt,
      reply: "I'll brighten it.",
      archetypeLabel: 'ignored',
    });

    const result = await submitEdit(user, {
      mode: 'chat',
      prompt: 'brighter',
      images_urls: ['https://fal.media/a.png'],
    });

    expect(result).toMatchObject({
      kind: 'submitted',
      reply: "I'll brighten it.",
      archetype: null,
      modelName: 'Nano Banana 2',
    });
    expect(chatPrompt).toHaveBeenCalledWith('brighter', [
      'https://fal.media/a.png',
    ]);
    expect(thumbnailPrompt).not.toHaveBeenCalled();
    // An edit keeps the picture; the thumbnail design rules would restyle it.
    expect(submit.mock.calls[0][1].input).toMatchObject({
      system_prompt: EDIT_SYSTEM_PROMPT,
      thinking_level: 'minimal',
    });
  });

  it('moves edits that redraw a person to Pro, at the edit price', async () => {
    const user = await createUser({ credits: 5 });
    chatPrompt.mockResolvedValue({ ...validPrompt, unlocked: ['person'] });

    const result = await submitEdit(user, {
      mode: 'chat',
      prompt: 'the left arm got cut off, fix it',
      images_urls: ['https://fal.media/a.png'],
    });

    expect(result).toMatchObject({
      creditsCharged: EDIT_MODEL.creditsPerImage,
      modelName: PHOTO_MODEL.modelName,
    });
    expect(submit.mock.calls[0][0]).toBe(PHOTO_MODEL.endpointId);
    expect(submit.mock.calls[0][1].input).toMatchObject({
      system_prompt: EDIT_SYSTEM_PROMPT,
      resolution: '2K',
    });
    expect(await creditsOf(user.id)).toBe(5 - EDIT_MODEL.creditsPerImage);
  });

  it('keeps text and colour edits on the quick model', async () => {
    const user = await createUser({ credits: 5 });
    chatPrompt.mockResolvedValue({ ...validPrompt, unlocked: ['text'] });

    await submitEdit(user, {
      mode: 'chat',
      prompt: 'make the headline red',
      images_urls: ['https://fal.media/a.png'],
    });

    expect(submit.mock.calls[0][0]).toBe(EDIT_MODEL.endpointId);
  });

  it('briefs the prompt writer with the attached photos and answers', async () => {
    const user = await createUser({ credits: 5 });
    const photos = ['https://fal.media/me.png', 'https://fal.media/logo.png'];

    await submitEdit(user, {
      mode: 'normal',
      prompt: 'my React course',
      images_urls: photos,
      choices: 'form',
      userChoices: { face: ['keep'] },
    });

    expect(thumbnailPrompt).toHaveBeenCalledWith({
      request: 'my React course',
      kind: 'youtube',
      family: 'gemini',
      answers: { face: ['keep'] },
      referenceImageUrls: photos,
    });
    // A design from photos runs on Pro at 2K and is priced like Quality.
    expect(submit.mock.calls[0][0]).toBe(PHOTO_MODEL.endpointId);
    expect(await creditsOf(user.id)).toBe(5 - PHOTO_MODEL.creditsPerImage);
  });
});
