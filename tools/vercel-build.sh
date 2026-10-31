#!/usr/bin/env bash
# Vercel's build command (see vercel.json).
#
# Production migrates the production database. Previews get their own Neon
# branch from the Neon integration (a copy of production taken when the
# preview is created), so they migrate that branch and a schema PR can be
# tried end to end without touching production.
#
# Guard: a preview whose DATABASE_URL still points at the production endpoint
# never migrates. That happened before the integration was set up.
set -euo pipefail

PROD_ENDPOINT="ep-falling-band-adjlj8l0"

case "${VERCEL_ENV:-}" in
  production)
    prisma migrate deploy
    ;;
  preview)
    if [[ "${DATABASE_URL:-}" == *"$PROD_ENDPOINT"* ]]; then
      echo "Refusing to migrate: this preview's DATABASE_URL is the production database."
    else
      prisma migrate deploy
    fi
    ;;
  *)
    echo "Skipping prisma migrate deploy (VERCEL_ENV=${VERCEL_ENV:-unset})."
    ;;
esac

next build
