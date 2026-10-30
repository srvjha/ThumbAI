/**
 * Generates the landing page's sample thumbnails and the footer artwork with
 * Fal, then writes optimised .webp files into public/samples and public/art.
 *
 *   node --env-file=.env tools/generate-samples.mjs [id ...]
 *
 * Existing outputs are skipped, so a re-run only spends on what is missing.
 * Pass ids to regenerate specific images (delete the .webp first).
 * The engraving crops are tuned to the renders on disk; after regenerating one,
 * adjust its crop and run with --retone (no Fal spend).
 * Every person, channel and brand in these prompts is fictional.
 */
import { fal } from '@fal-ai/client';
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

if (!process.env.FAL_KEY) {
  console.error('FAL_KEY is not set. Run with --env-file=.env');
  process.exit(1);
}
fal.config({ credentials: process.env.FAL_KEY });

const ROOT = path.resolve(import.meta.dirname, '..');
const SAMPLES = path.join(ROOT, 'public/samples');
const ART = path.join(ROOT, 'public/art');

// A short version of the app's design system prompt, so samples look like
// what the studio actually produces.
const RULES = `YouTube thumbnail that must read at 320px wide. Render only the text given in quotes, spelled exactly. Bold, high-contrast lettering, at most two text elements. One focal subject, clearly separated from the background, vivid but not muddy. No watermarks, no logos of real brands, no UI chrome. All people are fictional.`;

const gpt = (prompt, size) => ({
  endpoint: 'openai/gpt-image-2',
  input: {
    prompt: `${RULES}\n\n${prompt}`,
    image_size: size === '9:16' ? { width: 720, height: 1280 } : { width: 1280, height: 720 },
    quality: 'medium',
    num_images: 1,
    output_format: 'png',
  },
});

const JOBS = [
  {
    id: 'tech-api',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Tech tutorial thumbnail. A young South Asian developer with round glasses, surprised and pointing at a laptop whose screen glows with abstract code, dark navy desk scene with a cobalt rim light. Big white text "API IN 15 MIN" with "15" in electric yellow, top right.',
    ),
  },
  {
    id: 'gaming-frozen',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Gaming thumbnail. A lone armoured explorer in a fur hood stands on an icy cliff above a frozen valley at blue hour, a glowing orange campfire beside them, aurora overhead. Huge chunky white text with dark outline "DAY 100" bottom left. Cinematic, painterly 3D game look, no real game branding.',
    ),
  },
  {
    id: 'finance-salary',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Finance explainer thumbnail. A woman in her thirties with a sharp blazer looks at the camera with a raised eyebrow, holding a paper payslip torn into slices. To her right a bold bar chart in green and red on a clean cream background. Heavy black text "WHERE IT GOES" top left.',
    ),
  },
  {
    id: 'cooking-ramen',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Cooking thumbnail. Overhead-angled close up of a steaming bowl of ramen with a jammy soft egg, chilli oil and spring onions, chopsticks lifting noodles, on a dark slate table with warm light. Big white text "10 MIN RAMEN" with a red underline stroke, left side.',
    ),
  },
  {
    id: 'travel-lisbon',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Travel vlog thumbnail. A smiling traveller with a backpack, seen from the side, leaning out of a vintage yellow tram on a steep cobbled street with pastel buildings and the sea glowing at sunset behind. Bold white text with soft shadow "48 HOURS IN LISBON", upper left.',
    ),
  },
  {
    id: 'review-headphones',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Product review thumbnail. A sceptical bearded reviewer holds up a pair of matte sage-green over-ear headphones with no visible branding, studio lighting on a deep teal background. Large text "WORTH $399?" in white with the question mark in hot orange, right side.',
    ),
  },
  {
    id: 'fitness-5am',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Fitness thumbnail. A determined runner in a dark windbreaker mid-stride on an empty city bridge before dawn, breath visible, streetlights and a deep blue sky, strong rim light. Split composition with huge text "30 DAYS OF 5AM" in white, the "5AM" in bright lime.',
    ),
  },
  {
    id: 'podcast-remote',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Podcast episode thumbnail. Two hosts at microphones in a warm wood-panelled studio, one laughing and one with arms crossed looking doubtful, both facing camera. Bold cream text on a dark band "WE WERE WRONG" across the top. Fictional show, no logos.',
    ),
  },
  {
    id: 'short-crispy-rice',
    dir: SAMPLES,
    width: 720,
    ...gpt(
      'Vertical YouTube Shorts cover. Extreme close up of golden crispy rice crackling in a black cast iron pan, a spatula lifting a crunchy sheet, steam, warm moody light. Big text in the upper third "CRISPY RICE TRICK" in white with black outline.',
      '9:16',
    ),
  },
  {
    id: 'short-keyboard',
    dir: SAMPLES,
    width: 720,
    ...gpt(
      'Vertical YouTube Shorts cover. A hand pressing a key on a compact mechanical keyboard with translucent pastel keycaps and no branding, shallow depth of field, soft cool grey and blue lighting. Big text in the upper third "SILENT?!" in bold white.',
      '9:16',
    ),
  },
  {
    id: 'short-summit',
    dir: SAMPLES,
    width: 720,
    ...gpt(
      'Vertical YouTube Shorts cover. A hiker in a red jacket standing on a narrow mountain ridge at sunrise, sea of clouds below, golden light, seen from behind with arms raised. Big text in the upper third "4AM WAS WORTH IT" in white.',
      '9:16',
    ),
  },
  {
    id: 'blog-open-source',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Editorial blog cover image, not a YouTube thumbnail. Calm magazine-style illustration: a small lighthouse made of stacked open books on a rocky shore, flat graphic shapes, limited palette of deep navy, royal blue and warm off-white paper texture. Elegant serif title text "The Quiet Economics of Open Source" set in the left third. Generous negative space.',
    ),
  },
  {
    id: 'blog-slow-web',
    dir: SAMPLES,
    width: 1280,
    ...gpt(
      'Editorial blog cover image, not a YouTube thumbnail. Minimal still life photograph: an old dial-up modem and a snail on a pale sand-coloured surface, soft daylight, muted tones with one royal blue accent. Clean sans serif title "Designing for Slow Internet" in dark navy on the right. Magazine feel.',
    ),
  },
  {
    // The "upload" for the image-to-image demo: a plain portrait.
    id: 'source-portrait',
    dir: SAMPLES,
    width: 720,
    endpoint: 'openai/gpt-image-2',
    input: {
      prompt:
        'Plain natural portrait photo of a fictional woman in her late twenties with short curly dark hair and a mustard sweater, neutral expression, standing against a plain light grey wall, soft window light, shot on a phone. Head and shoulders, square crop. No text.',
      image_size: { width: 1024, height: 1024 },
      quality: 'medium',
      num_images: 1,
      output_format: 'png',
    },
  },
  {
    // Image-to-image: composites the portrait above into a thumbnail.
    id: 'edit-notes',
    dir: SAMPLES,
    width: 1280,
    endpoint: 'fal-ai/nano-banana-2/edit',
    dependsOn: 'source-portrait',
    input: (urls) => ({
      prompt:
        'Turn this person into the star of a YouTube productivity thumbnail. Keep her face and identity exactly. She looks overwhelmed but amused, hands on her head, surrounded by a flying storm of plain blank sticky notes and notebook pages on a bright cobalt blue background. No app icons, no logos, no symbols on the notes. Bold white text with black outline "I TRIED 12 NOTE APPS" on the right side.',
      image_urls: [urls['source-portrait']],
      aspect_ratio: '16:9',
      resolution: '1K',
      num_images: 1,
      output_format: 'png',
    }),
  },
  {
    // Hero backdrop: same family as the footer art. The empty sky holds the
    // headline; the dense foreground band overlaps the studio mockup.
    id: 'hero-engraving',
    dir: ART,
    width: 2560,
    endpoint: 'fal-ai/nano-banana-pro',
    input: {
      prompt:
        'A wide vintage copperplate engraving of a coastal landscape, printed in a single ink colour, royal blue (#3e63dd), on warm off-white paper (#f7f6f2). Composition from top to bottom: the top half is almost blank pale paper sky with only a few faint, finely hatched clouds; then a calm sea with distant headlands, cliffs and rolling hills along the coastline; the bottom fifth is a dense, dark, richly cross-hatched foreground band of pine trees, rocks, ferns and grasses running across the full width. Fine line work and cross-hatching like an 18th century etching. No other colours, no text, no border, no frame, no signature.',
      aspect_ratio: '16:9',
      resolution: '2K',
      num_images: 1,
      output_format: 'png',
    },
    // Trims the printed plate margin of this particular render (fractions of its size).
    post: (img) => toneEngraving(img, { left: 0.0273, top: 0, width: 0.947, height: 0.97 }),
  },
  {
    id: 'footer-engraving',
    dir: ART,
    width: 2400,
    endpoint: 'fal-ai/nano-banana-pro',
    input: {
      prompt:
        'A wide panoramic vintage copperplate engraving of a quiet landscape: rolling hills, a winding river, a small stone bridge, scattered trees and distant mountains under a big sky. Printed in a single ink colour, royal blue (#3e63dd), on warm off-white paper (#f7f6f2). Fine cross-hatching and line work like an 18th century etching, no shading in any other colour. The top third is almost empty paper, with the sky fading into blank paper so text can sit over it. No text, no border, no frame, no signature.',
      aspect_ratio: '21:9',
      resolution: '2K',
      num_images: 1,
      output_format: 'png',
    },
    // Trims the deckled paper edge of this particular render (fractions of its size).
    post: (img) => toneEngraving(img, { left: 0.0417, top: 0.0393, width: 0.9167, height: 0.8743 }),
  },
];

/**
 * Recolours an engraving as a strict duotone, brand ink on the app's paper
 * (#f7f6f2), so the art sits seamlessly on the page background. The red
 * channel is the ink density: blue ink is low in red, while paper and the
 * brownish foxing spots models like to add are both high in it, so the spots
 * disappear with the paper tone.
 */
const INK = [47, 75, 192]; // --brand-strong
const PAPER = [247, 246, 242]; // --background
const toneEngraving = async (img, crop) => {
  const { width = 0, height = 0 } = await sharp(img).metadata();
  const { data, info } = await sharp(img)
    .extract({
      left: Math.round(crop.left * width),
      top: Math.round(crop.top * height),
      width: Math.round(crop.width * width),
      height: Math.round(crop.height * height),
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 3) {
    const t = Math.min(1, Math.max(0, (data[i] - 40) / (232 - 40)));
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(INK[c] + (PAPER[c] - INK[c]) * t);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();
};

const args = process.argv.slice(2);
// --retone re-runs post-processing on the cached raw renders, no Fal call.
const retone = args.includes('--retone');
const only = new Set(args.filter((a) => !a.startsWith('--')));
const urls = {};
// node_modules is already gitignored, so raw renders never get committed.
const CACHE = path.join(ROOT, 'node_modules/.cache/thumbai-samples');

const write = async (job, buffer) => {
  const out = path.join(job.dir, `${job.id}.webp`);
  const img = job.post ? await job.post(buffer) : buffer;
  await sharp(img)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`wrote ${path.relative(ROOT, out)}`);
};

const run = async (job) => {
  const out = path.join(job.dir, `${job.id}.webp`);
  const raw = path.join(CACHE, `${job.id}.png`);
  if (retone) {
    if (job.post && existsSync(raw)) await write(job, readFileSync(raw));
    return;
  }
  if (existsSync(out)) {
    console.log(`skip ${job.id}`);
    return;
  }
  const input = typeof job.input === 'function' ? job.input(urls) : job.input;
  console.log(`generating ${job.id} on ${job.endpoint}`);
  const result = await fal.subscribe(job.endpoint, { input });
  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error(`${job.id}: no image in response`);
  urls[job.id] = url;
  const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
  // Raw renders are kept (gitignored) so post-processing can be re-tuned for free.
  if (job.post) writeFileSync(raw, buffer);
  await write(job, buffer);
};

mkdirSync(SAMPLES, { recursive: true });
mkdirSync(ART, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const selected = JOBS.filter((j) => only.size === 0 || only.has(j.id));
const independent = selected.filter((j) => !j.dependsOn);
const dependent = selected.filter((j) => j.dependsOn);

// Four at a time keeps us well inside Fal's concurrency limits.
const failures = [];
for (let i = 0; i < independent.length; i += 4) {
  const batch = independent.slice(i, i + 4);
  const results = await Promise.allSettled(batch.map(run));
  results.forEach((r, k) => {
    if (r.status === 'rejected') failures.push(`${batch[k].id}: ${r.reason?.message ?? r.reason}`);
  });
}
for (const job of dependent) {
  // When the source image was not generated in this run, upload the copy on disk.
  if (!retone && !urls[job.dependsOn]) {
    const source = JOBS.find((j) => j.id === job.dependsOn);
    const file = path.join(source.dir, `${source.id}.webp`);
    if (existsSync(file) && !existsSync(path.join(job.dir, `${job.id}.webp`))) {
      urls[job.dependsOn] = await fal.storage.upload(
        new Blob([readFileSync(file)], { type: 'image/webp' }),
      );
    }
  }
  await run(job).catch((e) => failures.push(`${job.id}: ${e.message}`));
}

if (failures.length) {
  console.error('\nFailed:\n' + failures.join('\n'));
  process.exit(1);
}
