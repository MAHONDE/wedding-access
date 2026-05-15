#!/bin/sh
set -e

echo "==> Wedding Access backend starting..."

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Seeding database (idempotent)..."
npx ts-node prisma/seed.ts || echo "Seed skipped or already done."

echo "==> Starting application..."
exec node dist/main
