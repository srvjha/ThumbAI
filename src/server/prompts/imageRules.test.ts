import { describe, expect, it } from 'vitest';
import {
  assembleEditPrompt,
  assembleImagePrompt,
  faceClause,
} from '@/server/prompts/imageRules';
import { parsePreferences } from '@/server/prompts/preferences';
import {
  BLOG_ARCHETYPES,
  YOUTUBE_ARCHETYPES,
  archetypeCatalogue,
} from '@/server/prompts/archetypes';

describe('assembleImagePrompt', () => {
  const scene = 'A YouTube thumbnail for a video about CDNs.';

  it('quotes the headline once, for Gemini in prose', () => {
    const prompt = assembleImagePrompt({
      family: 'gemini',
      scene,
      headline: 'WHAT IS CDN?',
      headlineStyle: 'heavy white sans-serif, upper left',
      face: null,
    });
    expect(prompt.match(/"WHAT IS CDN\?"/g)).toHaveLength(1);
    expect(prompt).toContain('spelled exactly as written');
    expect(prompt).not.toMatch(/category:/i);
  });

  it('sets a tag line beneath the headline, each quoted once', () => {
    const prompt = assembleImagePrompt({
      family: 'gemini',
      scene,
      headline: 'DESIGN NETFLIX',
      headlineStyle: null,
      tagline: 'FROM FIRST PRINCIPLES',
      face: null,
    });
    expect(prompt.match(/"DESIGN NETFLIX"/g)).toHaveLength(1);
    expect(prompt.match(/"FROM FIRST PRINCIPLES"/g)).toHaveLength(1);
    expect(prompt).toContain('carry no labels');
  });

  it('states there is no text when there is no headline', () => {
    expect(
      assembleImagePrompt({
        family: 'gemini',
        scene,
        headline: null,
        headlineStyle: null,
        face: null,
      }),
    ).toContain('free of any words');
  });

  it('leads with labelled rules for gpt-image', () => {
    const prompt = assembleImagePrompt({
      family: 'openai',
      scene,
      headline: 'IN 5 MIN',
      headlineStyle: null,
      face: null,
    });
    expect(prompt.startsWith('Purpose:')).toBe(true);
    expect(prompt).toContain(
      'Text (EXACT, verbatim, appears once): "IN 5 MIN"',
    );
  });
});

describe('faceClause', () => {
  it('keeps the real face and expression by default', () => {
    const clause = faceClause('keep', 0)!;
    expect(clause).toContain('first image');
    expect(clause).toContain('natural facial expression');
    expect(clause).toContain('completely unchanged');
  });

  it('changes only the expression when asked', () => {
    const clause = faceClause('expression', 1, 'calm confidence')!;
    expect(clause).toContain('second image');
    expect(clause).toContain(
      'only their facial expression changes, to calm confidence',
    );
  });

  it('adds nothing when the user does not want to appear', () => {
    expect(faceClause('none', 0)).toBeNull();
  });
});

describe('assembleEditPrompt', () => {
  it('locks everything the change does not need', () => {
    const prompt = assembleEditPrompt({
      change: 'Make the headline red.',
      unlocked: ['text'],
      referenceCount: 0,
    });
    expect(prompt).toMatch(/^Using the provided image, make only this change/);
    expect(prompt).toContain("every person's face");
    expect(prompt).not.toContain('lettering');
  });

  it('explains which image is being edited when references come along', () => {
    expect(
      assembleEditPrompt({
        change: 'Add the logo.',
        unlocked: [],
        referenceCount: 1,
      }),
    ).toContain(
      'the first image is the thumbnail being edited'.replace('the', 'The'),
    );
  });
});

describe('parsePreferences', () => {
  it('keeps the face by default and ignores unknown values', () => {
    const prefs = parsePreferences('youtube', {
      category: ['coding'],
      colorScheme: ['not-a-colour'],
      bogus: ['x'],
    });
    expect(prefs).toMatchObject({ archetype: 'coding', face: 'keep' });
    expect(prefs.lines).toEqual([]);
  });

  it('maps an expression pick onto the face, and lists the rest', () => {
    const prefs = parsePreferences('youtube', {
      face: ['curious'],
      colorScheme: ['dark'],
    });
    expect(prefs.face).toBe('expression');
    expect(prefs.expression).toMatch(/curiosity/);
    expect(prefs.lines).toEqual([
      'What color scheme do you prefer? Dark & Moody (Black, dark grays, and deep purples)',
    ]);
  });

  it('maps blog types onto blog archetypes', () => {
    expect(
      parsePreferences('blog', { blogType: ['Technology'] }).archetype,
    ).toBe('technology');
  });

  it('survives junk input', () => {
    expect(parsePreferences('youtube', 'oops')).toEqual({
      face: 'keep',
      lines: [],
    });
  });
});

describe('archetype catalogue', () => {
  it('gives the classifier one line per archetype', () => {
    expect(archetypeCatalogue('youtube').split('\n')).toHaveLength(
      Object.keys(YOUTUBE_ARCHETYPES).length,
    );
    expect(archetypeCatalogue('blog').split('\n')).toHaveLength(
      Object.keys(BLOG_ARCHETYPES).length,
    );
  });

  it('offers only real archetypes in the questionnaire', async () => {
    const { youtubeQuestionarie } = await import('@/utils/questionarie');
    const category = youtubeQuestionarie.find((q) => q.id === 'category')!;
    for (const option of category.options) {
      expect(Object.hasOwn(YOUTUBE_ARCHETYPES, option.value)).toBe(true);
    }
  });
});
