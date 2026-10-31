import { describe, expect, it } from 'vitest';
import {
  explicitText,
  inventedWords,
  runChecks,
  scenePart,
  tokens,
} from './checks';

const failures = (input: Parameters<typeof runChecks>[0]) =>
  runChecks(input)
    .filter((r) => r.failure)
    .map((r) => r.name);

const gemini = (scene: string, headline: string, tagline?: string) =>
  `${scene}\n\nThe only lettering in the image is the headline "${headline}"${tagline ? `, with a smaller tag line "${tagline}" directly beneath it` : ''}, spelled exactly as written.`;

describe('tokens', () => {
  it('splits digits from letters and drops punctuation', () => {
    expect(tokens("5AM for 30 days! Don't")).toEqual(['5', 'am', 'for', '30', 'days', 'dont']);
    expect(tokens('Next.js 16')).toEqual(['next', 'js', '16']);
  });
});

describe('inventedWords', () => {
  it('flags words the user never wrote', () => {
    expect(inventedWords('DESIGN NETFLIX FAST', 'Lets design netflix from first principles')).toEqual(['fast']);
  });

  it('accepts typo fixes, plurals and aliases', () => {
    expect(inventedWords('FIRST PRINCIPLES', 'from first priniciples')).toEqual([]);
    expect(inventedWords('REACT VS SVELTE', 'React versus Svelte')).toEqual([]);
    expect(inventedWords('10K SUBS', '0 to 10k subscribers')).toEqual([]);
  });
});

describe('explicitText', () => {
  it('reads text the user said goes on the image', () => {
    expect(explicitText('Text on the thumbnail: "DOCKER IN 1 HOUR"')).toBe('DOCKER IN 1 HOUR');
    expect(explicitText('a background with the text "Ağrınız Geçmeyecek!" behind me')).toBe('Ağrınız Geçmeyecek!');
  });

  it('does not treat a quoted title as text', () => {
    expect(explicitText('Make a thumbnail for title "Master RabbitMQ"')).toBeNull();
  });
});

describe('scenePart', () => {
  it('strips the fixed clauses and the gpt-image rules', () => {
    expect(scenePart(gemini('A scene.', 'HI'))).toBe('A scene.\n\n');
    expect(scenePart('Purpose: x\nRules: y\n\nImage: A scene.\n\nText (EXACT, verbatim): "HI"')).toBe('A scene.\n\n');
  });
});

describe('runChecks', () => {
  const base = { hasPhoto: false, faceNone: false };

  it('passes a faithful prompt', () => {
    expect(
      failures({
        ...base,
        request: 'Lets design netflix from first priniciples',
        headline: 'DESIGN NETFLIX',
        prompt: gemini('A YouTube thumbnail about streaming.', 'DESIGN NETFLIX', 'FROM FIRST PRINCIPLES'),
      }),
    ).toEqual([]);
  });

  it('catches invented words, leaks and lettering in the scene', () => {
    expect(
      failures({
        ...base,
        request: 'Lets design netflix',
        headline: 'DESIGN NETFLIX FAST',
        prompt: gemini('category: coding. A sign reads "DESIGN NETFLIX FAST".', 'DESIGN NETFLIX FAST'),
      }),
    ).toEqual(['no-category-leak', 'headline-from-request', 'headline-quoted-once', 'text-not-in-scene']);
  });

  it('allows connectives and unquoted mentions in the scene', () => {
    expect(
      failures({
        ...base,
        request: 'minecraft hardcore 100 days survival',
        headline: 'SURVIVING 100 DAYS',
        prompt: gemini('A video about surviving 100 days.', 'SURVIVING 100 DAYS'),
      }),
    ).toEqual([]);
    expect(inventedWords('IRON MAN IN INDIA', 'iron man on india')).toEqual([]);
  });

  it('flags a placeholder tag line', () => {
    expect(
      failures({ ...base, request: 'learn colours', headline: 'COLOURS', prompt: gemini('A scene.', 'COLOURS', '/ null') }),
    ).toEqual(['tagline-from-request', 'tagline-is-text']);
  });

  it('requires the user’s own text exactly', () => {
    expect(
      failures({
        ...base,
        request: 'Text on the thumbnail: "DOCKER IN 1 HOUR"',
        headline: 'DOCKER FAST',
        prompt: gemini('A scene.', 'DOCKER FAST'),
      }),
    ).toEqual(['explicit-text-exact']);
  });

  it('requires the face clause when a photo is attached', () => {
    expect(
      failures({ request: 'my vlog', headline: null, prompt: 'A scene.', hasPhoto: true, faceNone: false }),
    ).toEqual(['face-clause']);
    expect(
      failures({ request: 'my vlog', headline: null, prompt: 'A scene.', hasPhoto: true, faceNone: true }),
    ).toEqual([]);
  });
});
