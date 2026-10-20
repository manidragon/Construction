#!/bin/sh
set -e

echo "=========================================================="
echo "🏗️  Starting ApexBuild ERP Production Container"
echo "=========================================================="

# Ensure persistent data and uploads directory exist
mkdir -p /app/data/uploads

# Run Prisma schema push to ensure database and tables are ready
echo "📦 Synchronizing Prisma Database Schema..."
cd /app/backend && npx prisma db push --accept-data-loss
cd /app

# Optional Seed: If SEED_DB is set to "true", run seed
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding initial demo data and users..."
  cd /app/backend && npx tsx prisma/seed.ts || echo "⚠️ Seed skipped or encountered non-fatal notice"
  cd /app
fi

echo "🚀 Starting Server on port ${PORT:-5000}..."
exec node backend/dist/index.js
