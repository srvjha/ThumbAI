# ThumbAI

Generate YouTube thumbnails and blog cover images from a prompt, an image you
already have, or a blog URL.

## Workflows

| Route | What it does |
| --- | --- |
| `/studio/text-to-image` | Describe the thumbnail; the app writes a design prompt and generates it. |
| `/studio/image-to-image` | Upload photos (a face, a product) and composite them into a thumbnail. |
| `/studio/blog-cover` | Paste a blog URL. The page is fetched and read, and a cover image is designed from its actual content. |

Every workflow outputs YouTube (16:9, 1280×720) and Shorts (9:16, 720×1280).

## Stack

- Next.js 15 (App Router) and React 19
- Clerk for authentication
- Prisma and PostgreSQL
- Fal AI for image generation, OpenAI for prompt authoring
- Razorpay for payments
- Tailwind CSS v4 with shadcn/ui

## Image models

Defined in one place, `src/config/models.ts`. Swapping a model is a change
there rather than in the route handlers.

| Tier | Endpoint | Cost | Credits |
| --- | --- | --- | --- |
| Draft | `openai/gpt-image-2` (medium) | ~$0.040 / image | 1 |
| Quality | `fal-ai/nano-banana-pro` (2K) | ~$0.150 / image | 3 |
| Edit | `fal-ai/nano-banana-2/edit` | ~$0.080 / image | 2 |

Prompt authoring runs on `PROMPT_MODEL` in the same file, overridable with
`OPENAI_PROMPT_MODEL`.

## Getting started

```bash
git clone <repo> && cd thumbai
npm install                 # also runs prisma generate
cp .env.example .env        # then fill it in, see below
npx prisma migrate deploy   # apply migrations
npm run dev
```

Open http://localhost:3000.

### Environment

Copy `.env.example` and fill in every value — the app validates them at startup
via `src/config/env.ts` and will refuse to boot if any are missing.

There is deliberately **no** `NEXT_PUBLIC_FAL_KEY`. Anything prefixed
`NEXT_PUBLIC_` is inlined into the browser bundle, so a Fal credential there is
readable by any visitor and spendable against your account. Uploads go through
`/api/upload`, which holds the key server side.

### Webhooks

Two endpoints need to be reachable from the internet, so use a tunnel
(`ngrok http 3000`) in development:

| Provider | Endpoint | Purpose |
| --- | --- | --- |
| Clerk | `/api/webhook/register` | Creates the local `User` row on sign-up. Without it, sign-in succeeds but every API call returns 401. |
| Razorpay | `/api/webhook/payment` | Grants credits after a verified payment. |
| Fal | `/api/fal/webhook` | Receives finished generations. Set `NEXT_PUBLIC_FAL_WEBHOOK_URL` to the tunnel origin. |

Fal deliveries are verified against Fal's ED25519 JWKS, so they must arrive with
their original signature headers intact.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier |

## Architecture notes

**Credits are server-authoritative.** They are deducted inside the generation
routes with a conditional update guarded on `credits >= cost`, so concurrent
requests cannot overdraw, and refunded if the provider call fails. Nothing on
the client can move a balance.

**Generation is queued, not blocking.** Both `/api/generate` and `/api/edit`
submit to Fal's queue and return a `request_id`. The browser subscribes to
`/api/result-stream` (SSE, owner-only, capped at 5 minutes) while Fal calls
`/api/fal/webhook` with the result.

**Plan pricing lives in `src/config/plans.ts`.** Checkout sends only a plan id;
the price charged and the credits granted are both resolved server side.

## License

MIT
