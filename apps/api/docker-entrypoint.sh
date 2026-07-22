#!/bin/sh
set -e

echo "Waiting for database..."
echo "Applying migrations..."
npx prisma migrate deploy
echo "Seeding demo user..."
npx tsx prisma/seed.ts || true

if [ "${API_HOT_RELOAD:-0}" = "1" ]; then
  echo "Starting API (tsx watch)..."
  exec npx tsx watch src/index.ts
fi

echo "Starting API..."
exec node dist/index.js
