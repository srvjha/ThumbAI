import type { Workflow } from '@/components/dashboard/types';

export type StudioMode = 'text' | 'image' | 'blog';

export const STUDIO_MODES: {
  id: StudioMode;
  label: string;
  href: string;
  workflow: Workflow;
}[] = [
  {
    id: 'text',
    label: 'Text',
    href: '/studio/text-to-image',
    workflow: 'TEXT_TO_IMAGE',
  },
  {
    id: 'image',
    label: 'Image',
    href: '/studio/image-to-image',
    workflow: 'IMAGE_TO_IMAGE',
  },
  {
    id: 'blog',
    label: 'Blog',
    href: '/studio/blog-cover',
    workflow: 'URL_TO_IMAGE',
  },
];

export const modeById = (id: StudioMode) =>
  STUDIO_MODES.find((mode) => mode.id === id) ?? STUDIO_MODES[0];
