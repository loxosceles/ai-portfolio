#!/bin/bash

# Default to dev environment if not specified
ENVIRONMENT=${1:-dev}

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Error: Environment must be either 'dev' or 'prod'"
  echo "Usage: $0 [dev|prod]"
  exit 1
fi

# Function to run a command with proper logging
run() {
  local command="$1"
  local description="$2"
  
  echo -e "\n🔄 ${description}..."
  
  if eval "$command"; then
    echo "✅ ${description} completed"
  else
    echo "❌ ${description} failed"
    exit 1
  fi
}

# Main deployment process
echo "🚀 Starting deployment for environment: ${ENVIRONMENT}"

# 1. Setup data in S3
run "pnpm run setup:data:${ENVIRONMENT}" "Setting up data in S3"

# 2. Deploy infrastructure
if [[ "$ENVIRONMENT" == "prod" ]]; then
  echo -e "\n🔄 Infrastructure deployment (production)..."
  echo -e "\nProduction deployment requires manual approval for security-sensitive changes."
  echo -e "Running with --require-approval=broadening..."
  
  if cd infrastructure && ENVIRONMENT=prod npx cdk deploy --all --context stage=prod --require-approval=never --force; then
    cd ..
    echo "✅ Infrastructure deployment completed"
  else
    cd ..
    echo "❌ Infrastructure deployment failed"
    exit 1
  fi
else
  run "pnpm --filter=infrastructure run deploy:${ENVIRONMENT}" "Infrastructure deployment"
fi

# 3. Update environment variables
run "pnpm --filter=infrastructure run update-env:${ENVIRONMENT}" "Environment variables update"

# 4. Deploy frontend
run "pnpm --filter=infrastructure run update-env:frontend:${ENVIRONMENT} && pnpm --filter=frontend run deploy:${ENVIRONMENT}" "Frontend deployment"

# 5. Seed data (only in development environment)
if [[ "$ENVIRONMENT" == "dev" ]]; then
  run "pnpm --filter=infrastructure run seed:force:dev" "Developer and project data seeding (force)"
  run "pnpm --filter=infrastructure run seed:job-matching:dev" "Job matching data seeding"
else
  echo -e "\n⏭️ Skipping data seeding in production environment"
fi

# 6. Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws ssm get-parameter --name "/portfolio/${ENVIRONMENT}/WEB_CLOUDFRONT_DISTRIBUTION_ID" --region us-east-1 --query 'Parameter.Value' --output text)
run "aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths \"/*\" --region us-east-1" "CloudFront cache invalidation"

# 7. Show deployment URL
DOMAIN=$(aws ssm get-parameter --name "/portfolio/${ENVIRONMENT}/WEB_CLOUDFRONT_DOMAIN" --region us-east-1 --query 'Parameter.Value' --output text)
echo -e "\n🎉 Deployment completed successfully!"
echo -e "\n📍 Website: https://${DOMAIN}"