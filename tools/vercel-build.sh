#!/usr/bin/env bash
# Vercel's build command (see vercel.json).
#
# Preview deploys share the production DATABASE_URL, so only a production
# build may migrate. A preview of a PR that changes the schema will run
# against the old schema and may error; that is the price of never touching
# production before merge.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  prisma migrate deploy
else
  echo "Skipping prisma migrate deploy (VERCEL_ENV=${VERCEL_ENV:-unset})."
fi

next build
