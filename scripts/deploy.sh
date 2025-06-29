#!/bin/bash

# Full deployment script for manual deployment
# Usage: ./scripts/deploy.sh [dev|prod]

set -e  # Exit on any error

ENVIRONMENT=${1:-dev}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo "Error: Environment must be either 'dev' or 'prod'"
    echo "Usage: ./scripts/deploy.sh [dev|prod]"
    exit 1
fi

echo "🚀 Starting full deployment for $ENVIRONMENT environment..."

# Step 1: Deploy infrastructure
echo "📦 Deploying infrastructure..."
cd infrastructure && pnpm run deploy:$ENVIRONMENT && cd ..

# Step 2: Setup data
echo "📊 Setting up data..."
node infrastructure/lib/data-management/create-bucket.mjs $ENVIRONMENT
node infrastructure/lib/data-management/download-static-data.mjs $ENVIRONMENT

# Step 3: Update environment variables
echo "🔧 Updating environment variables..."
ENVIRONMENT=$ENVIRONMENT node infrastructure/lib/data-management/update-env.mjs

# Step 4: Deploy frontend
echo "🌐 Deploying frontend..."
cd infrastructure && pnpm run deploy:frontend:$ENVIRONMENT && cd ..

# Step 5: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws ssm get-parameter --name "/portfolio/${ENVIRONMENT}/WEB_CLOUDFRONT_DISTRIBUTION_ID" --region us-east-1 --query 'Parameter.Value' --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

# Get domain and show completion message
DOMAIN=$(aws ssm get-parameter --name "/portfolio/${ENVIRONMENT}/WEB_CLOUDFRONT_DOMAIN" --region us-east-1 --query 'Parameter.Value' --output text)
echo "✅ Deployment complete! Website available at https://$DOMAIN"