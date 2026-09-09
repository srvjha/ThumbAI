#!/usr/bin/env bash
# Dump the production database to backups/ (gitignored — contains user data).
#
# Uses pg_dump from the postgres:17 Docker image so no local Postgres client
# install is required.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.prod ]; then
  echo "error: .env.prod not found. It should hold the production DATABASE_URL." >&2
  exit 1
fi

PROD_URL=$(grep '^DATABASE_URL=' .env.prod | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
mkdir -p backups
OUT="backups/prod-$(date +%Y%m%d-%H%M%S).sql"

echo "Dumping production to $OUT ..."
docker run --rm postgres:17 pg_dump "$PROD_URL" --no-owner --no-privileges > "$OUT"

if [ ! -s "$OUT" ]; then
  echo "error: dump is empty" >&2
  rm -f "$OUT"
  exit 1
fi

echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
