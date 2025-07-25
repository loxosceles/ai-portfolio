#!/bin/bash
set -e

PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

# Ensure we're in the right directory
if [[ "$PWD" != "${PROJECT_ROOT}" ]]; then
  echo "❌ Error: You seem to be in the wrong directory."
  echo "Please run from project root: pnpm run publish-frontend:dev"
  exit 1
fi

echo "🚀 Publishing frontend for dev environment..."

# Define directory paths
INFRASTRUCTURE_DIR="${PROJECT_ROOT}/infrastructure"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# Step 1: Generate frontend environment variables
SERVICES=("frontend" "link-generator")

for service in "${SERVICES[@]}"; do
  echo "🔄 Generating $service environment variables..."
  (cd "$INFRASTRUCTURE_DIR" && ENVIRONMENT=dev ts-node ./lib/cli/bin/ssm-params.ts export --target="$service" --output)
done

# Step 2: Build Next.js app
echo "🏗️ Building Next.js application..."
(cd "$FRONTEND_DIR" && NEXT_PUBLIC_ENVIRONMENT=dev pnpm build)

# Step 3: Publish web app
echo "🌐 Publishing web application..."
(cd "$INFRASTRUCTURE_DIR" && pnpm run publish:web-app)

# Step 4: Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
(cd "$INFRASTRUCTURE_DIR" && pnpm run invalidate:cloudfront)

# Get CloudFront domain from stack outputs
echo "📡 Retrieving deployment URL..."
CLOUDFRONT_DOMAIN=$(cd "$INFRASTRUCTURE_DIR" && pnpm run --silent stack-outputs:web CloudfrontDomain)

echo "✅ Frontend publishing completed successfully!"
echo "Website is now live at: https://${CLOUDFRONT_DOMAIN}"
