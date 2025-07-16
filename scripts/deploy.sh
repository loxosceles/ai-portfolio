#!/bin/bash
set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

# Ensure ENVIRONMENT variable is set
if [[ -z "$ENVIRONMENT" ]]; then
  echo "❌ Error: ENVIRONMENT variable is not set."
  exit 1
fi

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

# Get CloudFront domain from stack outputs
echo "📡 Retrieving deployment URL..."
CLOUDFRONT_DOMAIN=$(cd infrastructure && pnpm run --silent stack-outputs:web CloudFrontDomain)

echo "✅ Deployment completed successfully!"
echo "Website is now live at: https://${CLOUDFRONT_DOMAIN}"
