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
#
# Migrations use the direct (unpooled) connection. Prisma holds a session
# advisory lock while migrating; through Neon's pooler the unlock can land on
# a different server connection, leaving the lock stuck on a pooled one and
# every later deploy timing out with P1002.
set -euo pipefail

PROD_ENDPOINT="ep-falling-band-adjlj8l0"

migrate() {
  DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}" prisma migrate deploy
}

case "${VERCEL_ENV:-}" in
  production)
    migrate
    ;;
  preview)
    if [[ "${DATABASE_URL:-}${DATABASE_URL_UNPOOLED:-}" == *"$PROD_ENDPOINT"* ]]; then
      echo "Refusing to migrate: this preview's DATABASE_URL is the production database."
    else
      migrate
    fi
    ;;
  *)
    echo "Skipping prisma migrate deploy (VERCEL_ENV=${VERCEL_ENV:-unset})."
    ;;
esac

next build
