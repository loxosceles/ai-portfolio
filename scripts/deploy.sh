#!/bin/bash
set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

# Check if we're in the wrong directory
if [[ "$PWD" != "${PROJECT_ROOT}" ]]; then
  echo "❌ Error: You seem to be in the wrong directory."
  echo "Please run from project root: pnpm run deploy:${ENVIRONMENT}"
  exit 1
fi

echo "🚀 Starting full deployment for $ENVIRONMENT environment..."

# Step 1: Provision infrastructure
echo "📦 Provisioning infrastructure..."
cd infrastructure && pnpm run provision:"$ENVIRONMENT" && cd ..

# Step 2: Build Next.js app
echo "🏗️ Building Next.js application..."
cd frontend && NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT pnpm build && cd ..

# Step 3: Publish web app
echo "🌐 Publishing web application..."
cd infrastructure && pnpm run publish:web-app && cd ..

# Step 4: Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
cd infrastructure && pnpm run invalidate:cloudfront && cd ..

echo "✅ Deployment completed successfully!"
