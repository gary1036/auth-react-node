#!/bin/sh
set -e

echo "Waiting for database..."
if ! npx prisma db push --skip-generate --accept-data-loss; then
  echo "Schema push failed (likely required columns on existing rows). Resetting database..."
  npx prisma db push --skip-generate --force-reset
fi
echo "Seeding demo user..."
npx tsx prisma/seed.ts || true

if [ "${API_HOT_RELOAD:-0}" = "1" ]; then
  echo "Starting API (tsx watch)..."
  exec npx tsx watch src/index.ts
fi

echo "Starting API..."
exec node dist/index.js
