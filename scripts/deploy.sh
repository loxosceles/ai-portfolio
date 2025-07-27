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

# Define directory paths
INFRASTRUCTURE_DIR="${PROJECT_ROOT}/infrastructure"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# Step 1: Provision infrastructure
echo "📦 Provisioning infrastructure..."
(cd "$INFRASTRUCTURE_DIR" && pnpm run provision:"$ENVIRONMENT")

# Step 1.5: Generate frontend environment variables
SERVICES=("frontend" "link-generator")

for service in "${SERVICES[@]}"; do
  echo "🔄 Generating $service environment variables..."
  (cd "$INFRASTRUCTURE_DIR" && pnpm run export-ssm-params:"$ENVIRONMENT" --target="$service")
done

# Step 2: Build Next.js app
echo "🏗️ Building Next.js application..."
(cd "$FRONTEND_DIR" && NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT pnpm build)

# Step 3: Publish web app
echo "🌐 Publishing web application..."
(cd "$INFRASTRUCTURE_DIR" && pnpm run publish-web-app:"$ENVIRONMENT")

# Step 4: Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
(cd "$INFRASTRUCTURE_DIR" && pnpm run invalidate-cloudfront:"$ENVIRONMENT")

# Get CloudFront domain from stack outputs
echo "📡 Retrieving deployment URL..."
CLOUDFRONT_DOMAIN=$(cd "$INFRASTRUCTURE_DIR" && pnpm run --silent stack-outputs-web:"$ENVIRONMENT" CloudfrontDomain)

echo "✅ Deployment completed successfully!"
echo "Website is now live at: https://${CLOUDFRONT_DOMAIN}"
