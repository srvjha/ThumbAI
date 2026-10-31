import type { ImageData } from '@/components/shared/imageUtils';
import type { AspectRatio, ModelTier, OutputFormat } from '@/config/models';

export type StyleAnswers = Record<string, string[]>;

/** The knobs in the composer's settings menu; they apply to the next send. */
export interface ChatSettings {
  aspectRatios: AspectRatio[];
  tier: ModelTier;
  numImages: number;
  outputFormat: OutputFormat;
  /** Words to set on the thumbnail; folded into the prompt. */
  overlayText: string;
  stylePreset: string;
  /** Ask the style questions in the thread before a fresh generation. */
  guided: boolean;
}

/** An image attached to a message: a local file still to upload, or a URL. */
export interface Attachment {
  id: string;
  previewUrl: string;
  file?: File;
  url?: string;
}

/** Everything needed to run (or re-run) one generation. */
export interface GenerationRequest {
  text: string;
  /** Present for an edit of an image already in the thread. */
  target?: ImageData;
  attachments: Attachment[];
  settings: ChatSettings;
  answers?: StyleAnswers;
}

export type GenerationPhase =
  | 'writing'
  | 'rendering'
  | 'done'
  | 'failed'
  | 'cancelled';

export type Turn =
  | {
      id: string;
      role: 'user';
      text: string;
      attachments: Attachment[];
      target?: ImageData;
    }
  | {
      id: string;
      role: 'questions';
      state: 'asking' | 'done' | 'skipped';
      answers?: StyleAnswers;
      /** The request waiting on the answers. */
      request: GenerationRequest;
    }
  | {
      id: string;
      role: 'generation';
      phase: GenerationPhase;
      request: GenerationRequest;
      /** Shapes to draw while rendering. */
      ratios: string[];
      images: ImageData[];
      error?: string;
      startedAt: number;
      /** How long writing the prompt took, once rendering started. */
      writingMs?: number;
      finishedAt?: number;
      /** The assistant's note on what it designed, from the prompt writer. */
      reply?: string | null;
      /** The design type it picked, e.g. "Coding". */
      archetype?: string | null;
      headline?: string | null;
      /** The image model's display name, e.g. "Nano Banana Pro". */
      modelName?: string;
      /** The server's generation rows, one per format. */
      generationIds?: string[];
      feedback?: 'up' | 'down' | null;
    };
