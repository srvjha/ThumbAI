/**
 * Pulls recent real generation requests from production, read-only, for the
 * production prompt eval. Writes tools/evals/out/requests.json, which is
 * gitignored: these are users' own words and stay out of the repo.
 *
 *   pnpm eval:pull            # 150 most recent distinct requests
 *   pnpm eval:pull 300
 *
 * What a row records: user_prompt (the request, or the article URL for blog
 * covers), model_used and model_endpoint. Older rows have no endpoint, and
 * chat follow-ups were recorded under both workflows, so a message that
 * reads as an instruction about an existing image is treated as an edit. Questionnaire answers and the photos themselves are
 * not stored: the eval stands in a sample photo and runs without answers.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const limit = Number(process.argv[2] ?? 150);
const pooled = process.env.DATABASE_URL;
if (!pooled) throw new Error('DATABASE_URL is not set (run with .env.prod)');

// The direct host, not the pooler: a long read-only session is cheaper there
// and never holds a pooled connection.
const url = process.env.DATABASE_URL_UNPOOLED ?? pooled.replace('-pooler', '');
const db = new PrismaClient({ datasourceUrl: url });

const EDIT_LIKE =
  /^(please\s+)?(change|make (the|it|him|her|me|this)|remove|add|enhance|can you|replace|put|move|keep|use|increase|decrease|fix)\b/i;

/** Requests that differ only in case, spacing or punctuation are one case. */
const fingerprint = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

type Row = {
  id: string;
  user_prompt: string;
  model_used: string | null;
  model_endpoint: string | null;
  model_tier: string | null;
  status: string;
  createdAt: Date;
};

const rows = await db.$transaction(async (tx) => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  return tx.$queryRaw<Row[]>`
    SELECT id, user_prompt, model_used::text, model_endpoint,
           model_tier::text, status::text, "createdAt"
    FROM "Thumbnail"
    WHERE length(trim(user_prompt)) > 0
    ORDER BY "createdAt" DESC
    LIMIT ${limit * 4}`;
});
await db.$disconnect();

const seen = new Set<string>();
const requests = [];
for (const row of rows) {
  const key = fingerprint(row.user_prompt);
  if (!key || seen.has(key)) continue;
  seen.add(key);
  const hasPhoto = row.model_used === 'IMAGE_TO_IMAGE';
  const isEdit =
    /\/edit$/.test(row.model_endpoint ?? '') ||
    EDIT_LIKE.test(row.user_prompt.trim());
  const isBlog = row.model_used === 'URL_TO_IMAGE' && /^https?:\/\//.test(row.user_prompt.trim());
  requests.push({
    id: row.id,
    kind: isEdit ? 'edit' : isBlog ? 'blog' : 'youtube',
    request: row.user_prompt.slice(0, 4000),
    hasPhoto: hasPhoto && !isEdit,
    tier: row.model_tier,
    status: row.status,
    createdAt: row.createdAt,
  });
  if (requests.length >= limit) break;
}

mkdirSync('tools/evals/out', { recursive: true });
writeFileSync('tools/evals/out/requests.json', JSON.stringify(requests, null, 2));
const counts = requests.reduce<Record<string, number>>((acc, r) => {
  acc[r.kind] = (acc[r.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${requests.length} requests from ${rows.length} rows`, counts);
