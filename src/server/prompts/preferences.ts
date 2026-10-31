import 'server-only';
import {
  blogQuestionarie,
  youtubeQuestionarie,
  type StudioQuestion,
} from '@/utils/questionarie';
import { archetypesFor, type ArchetypeId } from '@/server/prompts/archetypes';
import type { FaceMode } from '@/server/prompts/imageRules';

/** The questionnaire's answers, reduced to what the prompt pipeline uses. */
export interface Preferences {
  /** The archetype the user picked, when they picked one. */
  archetype?: ArchetypeId;
  face: FaceMode;
  /** For face mode "expression": the expression to show. */
  expression?: string;
  /** Text mode: whether the user wants a person at all. */
  person?: 'none' | 'presenter';
  /** Remaining answers as "Question: Label (description)" lines. */
  lines: string[];
}

const EXPRESSIONS: Record<string, string> = {
  excited: 'genuine high-energy excitement, eyes wide, mouth open in a smile',
  curious: 'intrigued curiosity, one eyebrow slightly raised',
  confident: 'calm confidence, a slight closed-mouth smile',
  fun: 'a warm, playful laugh',
};

/** Answers that are folded into structured fields, not listed as lines. */
const STRUCTURED = new Set(['category', 'blogType', 'face', 'person']);

/**
 * Reads the client's answers ({ questionId: [value] }). Only known question
 * ids and option values survive, so arbitrary client JSON never reaches a
 * prompt. With photos attached, the face defaults to "keep": a user who
 * uploads their face and skips the question wants their face.
 */
export const parsePreferences = (
  kind: 'youtube' | 'blog',
  raw: unknown,
): Preferences => {
  const questions: StudioQuestion[] =
    kind === 'blog' ? blogQuestionarie : youtubeQuestionarie;
  const answers =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const pick = (q: StudioQuestion) => {
    const value = answers[q.id];
    const first = Array.isArray(value) ? value[0] : value;
    return q.options.find((o) => o.value === first);
  };

  const prefs: Preferences = { face: 'keep', lines: [] };

  for (const q of questions) {
    const option = pick(q);
    if (!option) continue;

    if (q.id === 'category' || q.id === 'blogType') {
      const id = option.value.toLowerCase();
      if (Object.hasOwn(archetypesFor(kind), id)) {
        prefs.archetype = id as ArchetypeId;
      }
    } else if (q.id === 'face') {
      if (option.value === 'none') prefs.face = 'none';
      else if (Object.hasOwn(EXPRESSIONS, option.value)) {
        prefs.face = 'expression';
        prefs.expression = EXPRESSIONS[option.value];
      }
    } else if (q.id === 'person') {
      prefs.person = option.value === 'presenter' ? 'presenter' : 'none';
    }

    if (!STRUCTURED.has(q.id)) {
      prefs.lines.push(`${q.title} ${option.label} (${option.description})`);
    }
  }

  return prefs;
};
