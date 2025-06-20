#!/bin/bash
set -e

# Get values from CloudFormation outputs
echo "Fetching deployment values from CloudFormation..."
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name PortfolioCombinedWebsiteStack-dev --query "Stacks[0].Outputs[?OutputKey=='CombinedBucketName'].OutputValue" --output text --region us-east-1)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name PortfolioCombinedWebsiteStack-dev --query "Stacks[0].Outputs[?OutputKey=='CombinedDistributionId'].OutputValue" --output text --region us-east-1)
DOMAIN_NAME=$(aws cloudformation describe-stacks --stack-name PortfolioCombinedWebsiteStack-dev --query "Stacks[0].Outputs[?OutputKey=='CombinedDistributionDomainName'].OutputValue" --output text --region us-east-1)

# Validate that we got the values
if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ] || [ -z "$DOMAIN_NAME" ]; then
  echo "Error: Failed to retrieve deployment values from CloudFormation"
  exit 1
fi

echo "Deployment values:"
echo "- S3 Bucket: $BUCKET_NAME"
echo "- CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "- Domain Name: $DOMAIN_NAME"

# Deploy using the established pnpm command
echo "Deploying frontend using pnpm deploy:frontend..."
cd /workspaces/ai-portfolio-frontend
pnpm deploy:frontend

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region us-east-1

echo "Website deployed successfully!"
echo "Your website is available at: https://$DOMAIN_NAME"