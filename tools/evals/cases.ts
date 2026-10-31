/**
 * Synthetic requests that widen the production sample: production has only a
 * few dozen rows, almost all developer topics. Each line covers a kind of
 * request real users send that the sample lacks: other niches, languages,
 * typos, explicit text, described scenes, brands and people.
 */
export interface EvalCase {
  id: string;
  source: 'production' | 'synthetic';
  kind: 'youtube' | 'blog' | 'edit';
  request: string;
  /** A photo of the user was attached (the eval stands in a sample photo). */
  hasPhoto?: boolean;
  answers?: Record<string, string[]>;
}

const yt = (
  id: string,
  request: string,
  extra: Partial<EvalCase> = {},
): EvalCase => ({ id, source: 'synthetic', kind: 'youtube', request, ...extra });

export const SYNTHETIC_CASES: EvalCase[] = [
  // Bare titles across niches.
  yt('cooking', 'easy butter chicken recipe at home'),
  yt('fitness', 'I did 100 pushups every day for a month'),
  yt('finance', 'how to save your first 10 lakh rupees'),
  yt('travel', '3 days in tokyo on a budget'),
  yt('gaming', 'minecraft hardcore 100 days survival'),
  yt('beauty', 'my 5 minute everyday makeup routine'),
  yt('cars', 'Tesla Model 3 vs BMW i4 honest review'),
  yt('phone-review', 'iPhone 17 Pro review after 2 weeks'),
  yt('news', 'OpenAI just announced GPT-6'),
  yt('kids', 'learn colours with animals for toddlers'),
  yt('music', 'how to play wonderwall on guitar beginner lesson'),
  yt('podcast', 'Episode 42: building a startup with no funding'),
  yt('vlog', 'a day in my life as a software engineer in bangalore'),
  yt('mistakes', '7 mistakes every new runner makes'),
  yt('listicle', 'top 10 vs code extensions for 2026'),
  yt('opinion', 'why I quit my FAANG job'),
  yt('story', 'the time I got scammed in thailand'),
  yt('before-after', 'transforming my messy garage in one weekend'),
  yt('reaction', 'reacting to the worst coding interview ever'),
  yt('tutorial-long', 'Complete Python tutorial for absolute beginners in 2026 (12 hours, with projects)'),

  // Typos, casing, slang.
  yt('typo-1', 'how to lern javascrpit in 30 dayz'),
  yt('typo-2', 'kubernets explaned for begginers'),
  yt('lowercase-slang', 'bro this ai tool is insane fr'),

  // Non-English.
  yt('hindi', 'घर पर पनीर टिक्का कैसे बनाएं'),
  yt('hinglish', 'kaise banaye perfect chai ghar pe'),
  yt('spanish', 'cómo ganar dinero con YouTube en 2026'),
  yt('turkish-text', 'Bel ağrısı için 3 egzersiz, yazı: "AĞRI BİTTİ"'),

  // Explicit on-image text.
  yt('text-colon', 'Docker vs Podman\nText on the thumbnail: "WHICH ONE?"'),
  yt('text-with', 'thumbnail with the text "I QUIT" and a burning laptop'),
  yt('text-write', 'write "DAY 1" in huge red letters, me at the gym'),
  yt('text-headline', 'headline: "$0 TO $10K" for my freelancing journey video'),
  yt('no-text', 'a cozy cabin in the snow at night, no text'),

  // Quoted titles (title, not headline).
  yt('quoted-title', 'Make a thumbnail for my video "Why Rust Is Taking Over Systems Programming"'),
  yt('quoted-title-keep', 'Create a thumbnail for title "Scaling Postgres" and keep the text same as the title'),

  // Described scenes and art styles.
  yt('scene-anime', 'anime style samurai standing on a neon tokyo rooftop in the rain'),
  yt('scene-3d', '3D pixar style cute robot watering plants on mars'),
  yt('scene-photo', 'photorealistic lion wearing a crown sitting on a throne, golden hour'),
  yt('brand-colours', 'spotify wrapped 2026 reaction, use spotify green and black only'),
  yt('public-figure', 'Elon Musk vs Mark Zuckerberg cage fight explained'),
  yt('layout', 'split screen, left side old phone, right side new phone, big arrow in the middle'),

  // With the user's photo.
  yt('photo-title', 'I built an app in 24 hours', { hasPhoto: true }),
  yt('photo-scene', 'me standing in front of the eiffel tower looking surprised', { hasPhoto: true }),
  yt('photo-none', 'best budget laptops 2026', {
    hasPhoto: true,
    answers: { face: ['none'] },
  }),
  yt('photo-expression', 'my honest review of the vision pro', {
    hasPhoto: true,
    answers: { face: ['excited'], appearance: ['right'] },
  }),
  yt('photo-picked-category', 'system design of uber', {
    hasPhoto: true,
    answers: { category: ['coding'], face: ['keep'] },
  }),

  // Edge cases.
  yt('emoji', '🔥🔥 crazy giveaway 🔥🔥'),
  yt('one-word', 'react'),
  yt('gibberish', 'asdf qwer zxcv'),

  // Chat edits (run without the image, which production did not store).
  { id: 'edit-bigger', source: 'synthetic', kind: 'edit', request: 'make the text bigger' },
  { id: 'edit-remove-word', source: 'synthetic', kind: 'edit', request: 'remove the word fast from the title' },
  { id: 'edit-bg', source: 'synthetic', kind: 'edit', request: 'change the background to a red gradient' },
  { id: 'edit-smile', source: 'synthetic', kind: 'edit', request: 'make me smile' },
  { id: 'edit-add-logo', source: 'synthetic', kind: 'edit', request: 'add the netflix logo next to the headline' },
  { id: 'edit-vague', source: 'synthetic', kind: 'edit', request: 'make it better' },
];
