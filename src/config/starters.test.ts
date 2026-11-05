import { describe, expect, it } from 'vitest';
import { starterHref, starterPrompt } from './starters';

describe('starterPrompt', () => {
  it('returns the prompt for a known id', () => {
    expect(starterPrompt('coding')).toContain('API in 15 min');
  });

  it.each([null, undefined, '', 'nope', 'constructor', '__proto__'])(
    'returns null for %s',
    (id) => {
      expect(starterPrompt(id)).toBeNull();
    },
  );

  it('links to the text studio by id', () => {
    expect(starterHref('recipe')).toBe('/studio/text-to-image?starter=recipe');
  });
});
