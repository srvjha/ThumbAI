import { writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { generateThumbnailPrompt } from '@/server/prompts/thumbnailPrompt';
import { generateChatPrompt } from '@/server/prompts/chatPrompt';

/**
 * Real requests, including ones production handled badly, run through the
 * prompt pipeline. Writes tools/evals/out/prompts.md for reading; the
 * assertions only catch regressions that are clear-cut.
 */
const PHOTO = 'https://thumbai.srvjha.in/samples/podcast-remote.webp';

const cases = [
  { name: 'short playful request', request: 'iron man on india', family: 'openai' as const },
  {
    name: 'detailed scene, no title',
    request:
      'In 4k 3d show me me afraid in shaggy garage holding a pair of pink roller skates with dry blood on them while creepy white man look at me nervously from behind',
    family: 'openai' as const,
  },
  {
    name: 'explicit layout',
    request:
      'make a instagram reel cover image for title what is cdn make it look like person with the title at center and diagrams around it',
    family: 'gemini' as const,
  },
  { name: 'launch', request: 'Next.js 16 is finally here', family: 'gemini' as const },
  { name: 'challenge', request: 'I tried waking up at 5am for 30 days', family: 'gemini' as const },
  { name: 'comparison', request: 'React vs Svelte in 2026', family: 'openai' as const },
  {
    name: 'results',
    request: 'how I grew my channel from 0 to 10k subscribers in 6 months',
    family: 'gemini' as const,
  },
  {
    name: 'user-given text',
    request: 'Docker crash course\nText on the thumbnail: "DOCKER IN 1 HOUR"',
    family: 'gemini' as const,
    expectHeadline: 'DOCKER IN 1 HOUR',
  },
  {
    name: 'photo, keep face',
    request: 'Yuji AMV tutorial',
    family: 'gemini' as const,
    referenceImageUrls: [PHOTO],
    answers: { face: ['keep'] },
  },
  {
    name: 'photo, new expression, picked category',
    request: 'system design interview prep',
    family: 'gemini' as const,
    referenceImageUrls: [PHOTO],
    answers: { category: ['coding'], face: ['excited'], appearance: ['right'] },
  },
  {
    name: 'quoted topic is a title, not the headline',
    request: 'Make a youtube thumbnail for topic "Lets design netflix from first priniciples"',
    family: 'gemini' as const,
    referenceImageUrls: [PHOTO],
    answers: { category: ['coding'], face: ['keep'], appearance: ['left'] },
  },
  { name: 'gibberish', request: 'asdkjh qweoiu zzxq', family: 'gemini' as const, expectInvalid: true },
];

const edits = [
  'make the text bigger',
  'make me smile',
  'change the background to a red gradient',
  'add the word "FREE" in the top right',
  'have title design netflix and use logo of it as well remove the word fast',
];

describe('prompt evals', () => {
  it('writes every case', async () => {
    const out: string[] = ['# Prompt eval\n'];

    const results = await Promise.all(
      cases.map((c) =>
        generateThumbnailPrompt({
          request: c.request,
          kind: 'youtube',
          family: c.family,
          answers: c.answers,
          referenceImageUrls: c.referenceImageUrls,
        }).then((r) => ({ c, r })),
      ),
    );

    for (const { c, r } of results) {
      out.push(
        `## ${c.name} (${c.family})\n\n**Request:** ${c.request}\n\n**Archetype:** ${r.archetype ?? '-'} · **Headline:** ${r.headline ?? 'none'} · **Web search:** ${r.needs_factual_grounding ?? false}\n\n\`\`\`\n${r.response}\n\`\`\`\n`,
      );
    }

    out.push('# Chat edits\n');
    const editResults = await Promise.all(edits.map((e) => generateChatPrompt(e)));
    edits.forEach((e, i) =>
      out.push(`**${e}**\n\n\`\`\`\n${editResults[i].response}\n\`\`\`\n`),
    );
    writeFileSync('tools/evals/out/prompts.md', out.join('\n'));

    for (const { c, r } of results) {
      expect(r.valid_prompt, c.name).toBe(!c.expectInvalid);
      if (!r.valid_prompt) continue;
      expect(r.response, c.name).not.toMatch(/category:/i);
      if (c.expectHeadline) expect(r.headline, c.name).toBe(c.expectHeadline);
      if (c.name.startsWith('quoted topic')) {
        expect(r.headline, c.name).not.toMatch(/priniciples|lets design/i);
      }
      if (c.referenceImageUrls && c.answers?.face?.[0] !== 'none') {
        expect(r.response, c.name).toContain('completely unchanged');
      }
    }
    for (const r of editResults) expect(r.valid_prompt).toBe(true);

  });
});
