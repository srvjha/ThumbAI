import { describe, expect, it } from 'vitest';
import { isPrivateAddress } from '@/server/articles';
import { isAllowedSource } from '@/server/imageProxy';
import { assertImageUrls, parseWorkflow } from '@/server/generations/input';

describe('isAllowedSource', () => {
  it.each([
    'https://fal.media/files/a.png',
    'https://v3.fal.media/files/a.png',
    'https://storage.fal.ai/a.png',
  ])('allows %s', (url) => {
    expect(isAllowedSource(url)).not.toBeNull();
  });

  it.each([
    'https://evilfal.media/a.png',
    'https://fal.media.evil.com/a.png',
    'http://fal.media/a.png',
    'https://169.254.169.254/latest/meta-data',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isAllowedSource(url)).toBeNull();
  });
});

describe('isPrivateAddress', () => {
  it.each([
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '100.64.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:169.254.169.254',
  ])('treats %s as private', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '2606:4700:4700::1111'])(
    'treats %s as public',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});

describe('parseWorkflow', () => {
  it('accepts known workflows and absence', () => {
    expect(parseWorkflow('URL_TO_IMAGE')).toBe('URL_TO_IMAGE');
    expect(parseWorkflow(undefined)).toBeUndefined();
  });

  it.each(['NOPE', 'toString', 42])('rejects %s', (value) => {
    expect(() => parseWorkflow(value)).toThrow('Unknown workflow');
  });
});

describe('assertImageUrls', () => {
  it('rejects non-strings and non-https', () => {
    expect(() => assertImageUrls([42])).toThrow();
    expect(() => assertImageUrls(['http://x.test/a.png'])).toThrow();
  });
});
