import { existsSync, readFileSync, writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { fetchArticle } from '@/server/articles';
import { generateChatPrompt } from '@/server/prompts/chatPrompt';
import { generateThumbnailPrompt } from '@/server/prompts/thumbnailPrompt';
import { SYNTHETIC_CASES, type EvalCase } from './cases';
import { runChecks, type CheckResult } from './checks';
import { judgeEdit, judgeGeneration, type EditVerdict, type GenerationVerdict } from './judge';

/**
 * Runs real production requests (pulled by `pnpm eval:pull`) and a synthetic
 * spread through the prompt pipeline, then scores every result twice: with
 * property checks that hold for any input, and with an LLM judge using a
 * fixed rubric. Writes tools/evals/out/production.md and production.json.
 *
 * It never calls Fal: it grades what the image model would be told.
 */
const PHOTO = 'https://thumbai.srvjha.in/samples/podcast-remote.webp';
const CONCURRENCY = 6;
const EXPECT_INVALID = new Set(['gibberish']);

type Result = {
  c: EvalCase;
  brief: string;
  valid: boolean;
  prompt: string;
  headline?: string | null;
  archetype?: string;
  checks: CheckResult[];
  judge?: GenerationVerdict | EditVerdict;
  error?: string;
  pass: boolean;
};

const loadCases = (): EvalCase[] => {
  const file = 'tools/evals/out/requests.json';
  const production: EvalCase[] = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8')).map(
        (r: { id: string; kind: EvalCase['kind']; request: string; hasPhoto?: boolean }) => ({
          id: r.id.slice(0, 8),
          source: 'production' as const,
          kind: r.kind,
          request: r.request,
          hasPhoto: r.hasPhoto,
        }),
      )
    : [];
  return [...production, ...SYNTHETIC_CASES];
};

const pool = async <T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
};

/** The same brief submit.ts builds for a blog URL. */
const blogBrief = async (url: string) => {
  const a = await fetchArticle(url);
  return [
    `URL: ${a.url}`,
    `Title: ${a.title || '(none found)'}`,
    `Meta description: ${a.description || '(none found)'}`,
    'Headings:',
    a.headings.map((h) => `- ${h}`).join('\n') || '(none found)',
    '',
    'Article text:',
    a.text,
  ].join('\n');
};

const runCase = async (c: EvalCase): Promise<Result> => {
  const base = { c, brief: c.request, valid: false, prompt: '', checks: [], pass: false };
  try {
    if (c.kind === 'edit') {
      const r = await generateChatPrompt(c.request, []);
      if (!r.valid_prompt) {
        return { ...base, prompt: r.response, checks: [{ name: 'accepted', failure: 'edit rejected' }] };
      }
      const judge = await judgeEdit({ request: c.request, prompt: r.response });
      return { ...base, valid: true, prompt: r.response, judge, pass: judge.pass };
    }

    const brief = c.kind === 'blog' ? await blogBrief(c.request) : c.request;
    const faceNone = c.answers?.face?.[0] === 'none';
    const r = await generateThumbnailPrompt({
      request: brief,
      kind: c.kind,
      // Draft (gpt-image) is the default tier; Quality is Gemini.
      family: c.id.length % 2 ? 'openai' : 'gemini',
      answers: c.answers,
      referenceImageUrls: c.hasPhoto ? [PHOTO] : undefined,
    });

    const expectInvalid = EXPECT_INVALID.has(c.id);
    if (!r.valid_prompt) {
      const failure = expectInvalid ? null : `rejected: ${r.response}`;
      return { ...base, brief, prompt: r.response, checks: [{ name: 'accepted', failure }], pass: expectInvalid };
    }
    if (expectInvalid) {
      return { ...base, brief, valid: true, prompt: r.response, checks: [{ name: 'rejects-gibberish', failure: 'accepted gibberish' }] };
    }

    const checks = runChecks({
      request: brief,
      prompt: r.response,
      headline: r.headline,
      hasPhoto: !!c.hasPhoto,
      faceNone,
    });
    const judge = await judgeGeneration({
      request: brief,
      archetype: r.archetype,
      hasPhoto: !!c.hasPhoto,
      faceNone,
      prompt: r.response,
    });
    return {
      ...base,
      brief,
      valid: true,
      prompt: r.response,
      headline: r.headline,
      archetype: r.archetype,
      checks,
      judge,
      pass: judge.pass && checks.every((x) => !x.failure),
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
};

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');
const oneLine = (s: string, n = 200) => s.replace(/\s+/g, ' ').slice(0, n);

const report = (results: Result[]): string => {
  const out: string[] = ['# Production prompt eval\n'];
  const run = results.filter((r) => !r.error);
  const passed = run.filter((r) => r.pass).length;
  out.push(`**${passed}/${run.length} passed (${pct(passed, run.length)})** · ${results.length - run.length} errored\n`);

  out.push('| Set | Cases | Pass |\n|---|---|---|');
  for (const [label, filter] of [
    ['Production, generations', (r: Result) => r.c.source === 'production' && r.c.kind !== 'edit'],
    ['Production, edits', (r: Result) => r.c.source === 'production' && r.c.kind === 'edit'],
    ['Synthetic, generations', (r: Result) => r.c.source === 'synthetic' && r.c.kind !== 'edit'],
    ['Synthetic, edits', (r: Result) => r.c.source === 'synthetic' && r.c.kind === 'edit'],
  ] as const) {
    const set = run.filter(filter);
    out.push(`| ${label} | ${set.length} | ${pct(set.filter((r) => r.pass).length, set.length)} |`);
  }

  const counts = new Map<string, number>();
  const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
  for (const r of run) {
    for (const c of r.checks) if (c.failure) bump(`check: ${c.name}`);
    const j = r.judge;
    if (j && 'missing_elements' in j) {
      if (j.missing_elements.length) bump('judge: missing elements');
      if (j.added_restrictions.length) bump('judge: added restrictions');
      if (j.archetype_fit === 'no') bump('judge: archetype does not fit');
      if (j.archetype_fit === 'partly') bump('judge: archetype fits partly (not a failure)');
      if (!j.headline_faithful) bump('judge: headline unfaithful');
    } else if (j) {
      if (!j.faithful) bump('judge (edit): not faithful');
      if (j.widened.length) bump('judge (edit): widened');
      if (j.wrongly_kept.length) bump('judge (edit): wrongly kept');
    }
  }
  out.push('\n## Failures by kind\n\n| Failure | Cases |\n|---|---|');
  for (const [k, n] of [...counts].sort((a, b) => b[1] - a[1])) out.push(`| ${k} | ${n} |`);

  const byArchetype = new Map<string, Result[]>();
  for (const r of run) if (r.archetype) byArchetype.set(r.archetype, [...(byArchetype.get(r.archetype) ?? []), r]);
  out.push('\n## By archetype\n\n| Archetype | Cases | Pass |\n|---|---|---|');
  for (const [a, rs] of [...byArchetype].sort((x, y) => y[1].length - x[1].length)) {
    out.push(`| ${a} | ${rs.length} | ${pct(rs.filter((r) => r.pass).length, rs.length)} |`);
  }

  out.push('\n## Failing cases\n');
  for (const r of results.filter((x) => !x.pass)) {
    out.push(`### ${r.c.source}/${r.c.kind} ${r.c.id}${r.c.hasPhoto ? ' (photo)' : ''}\n`);
    out.push(`**Request:** ${oneLine(r.c.request, 400)}\n`);
    if (r.error) {
      out.push(`**Error:** ${r.error}\n`);
      continue;
    }
    out.push(`**Archetype:** ${r.archetype ?? '-'} · **Headline:** ${r.headline ?? 'none'}\n`);
    const failed = r.checks.filter((c) => c.failure);
    if (failed.length) out.push(`**Checks:** ${failed.map((c) => `${c.name} (${c.failure})`).join('; ')}\n`);
    const j = r.judge;
    if (j && 'missing_elements' in j) {
      out.push(
        `**Judge:** ${j.reason}${j.missing_elements.length ? `\n- Missing: ${j.missing_elements.join('; ')}` : ''}${j.added_restrictions.length ? `\n- Added restrictions: ${j.added_restrictions.join('; ')}` : ''}${j.headline_issue ? `\n- Headline: ${j.headline_issue}` : ''}\n- Archetype fit: ${j.archetype_fit}\n`,
      );
    } else if (j) {
      out.push(`**Judge:** ${j.reason}${j.widened.length ? `\n- Widened: ${j.widened.join('; ')}` : ''}${j.wrongly_kept.length ? `\n- Wrongly kept: ${j.wrongly_kept.join('; ')}` : ''}\n`);
    }
    out.push(`\`\`\`\n${r.prompt}\n\`\`\`\n`);
  }
  return out.join('\n');
};

describe('production prompt eval', () => {
  it(
    'scores real and synthetic requests',
    async () => {
      const cases = loadCases();
      const results = await pool(cases, runCase);
      writeFileSync('tools/evals/out/production.json', JSON.stringify(results, null, 2));
      writeFileSync('tools/evals/out/production.md', report(results));

      const run = results.filter((r) => !r.error);
      const rate = run.filter((r) => r.pass).length / Math.max(1, run.length);
      console.log(`production eval: ${Math.round(rate * 100)}% of ${run.length} passed; see tools/evals/out/production.md`);
      // Most cases must at least run; the pass rate is the number to track.
      expect(run.length).toBeGreaterThan(cases.length * 0.9);
    },
    30 * 60_000,
  );
});
