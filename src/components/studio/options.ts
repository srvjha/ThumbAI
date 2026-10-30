import { MAX_IMAGES_PER_REQUEST, OUTPUT_FORMATS } from '@/config/models';

export const IMAGE_COUNT_OPTIONS = Array.from(
  { length: MAX_IMAGES_PER_REQUEST },
  (_, i) => ({ value: i + 1, label: String(i + 1) }),
);

export const OUTPUT_FORMAT_OPTIONS = OUTPUT_FORMATS.map((format) => ({
  value: format as string,
  label: format.toUpperCase(),
}));
