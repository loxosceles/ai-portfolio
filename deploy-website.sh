#!/bin/bash
set -e

# Build the Next.js application
echo "Building Next.js application..."
cd /workspaces/ai-portfolio-frontend/frontend
npm run build

# S3 bucket name
BUCKET_NAME="portfolio-combined-dev-560410572733-us-east-1"
echo "Deploying to bucket: $BUCKET_NAME"

# Upload the static export files
if [ -d "out" ]; then
  echo "Uploading out/ directory to S3..."
  aws s3 sync out/ s3://$BUCKET_NAME/ --delete --region us-east-1
else
  echo "Error: 'out' directory not found. Make sure your Next.js build completed successfully."
  exit 1
fi

# CloudFront distribution ID
DISTRIBUTION_ID="E9T7A7WGATZQF"
echo "CloudFront distribution ID: $DISTRIBUTION_ID"

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

# CloudFront domain name
DOMAIN_NAME="d1ul10m7suvoxi.cloudfront.net"
echo "Website deployed successfully!"
echo "Your website is available at: https://$DOMAIN_NAME"