#!/bin/bash

# Script to create production DynamoDB tables for AI Portfolio
# These tables must match the exact structure expected by the resolvers

set -e

REGION="eu-central-1"

echo "Creating production DynamoDB tables..."

# 1. Create Developer Table
echo "Creating PortfolioDevelopers-prod table..."
aws dynamodb create-table \
  --table-name "PortfolioDevelopers-prod" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --sse-specification Enabled=true \
  --region $REGION

# 2. Create Projects Table with GSI
echo "Creating PortfolioProjects-prod table with GSI..."
aws dynamodb create-table \
  --table-name "PortfolioProjects-prod" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=developerId,AttributeType=S \
    AttributeName=order,AttributeType=N \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=byDeveloperId,KeySchema=[{AttributeName=developerId,KeyType=HASH},{AttributeName=order,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
  --billing-mode PAY_PER_REQUEST \
  --sse-specification Enabled=true \
  --region $REGION

# 3. Create Recruiter Profiles Table
echo "Creating PortfolioRecruiterProfiles-prod table..."
aws dynamodb create-table \
  --table-name "PortfolioRecruiterProfiles-prod" \
  --attribute-definitions \
    AttributeName=linkId,AttributeType=S \
  --key-schema \
    AttributeName=linkId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --sse-specification Enabled=true \
  --region $REGION

echo "Waiting for tables to become active..."

# Wait for tables to be active
aws dynamodb wait table-exists --table-name "PortfolioDevelopers-prod" --region $REGION
aws dynamodb wait table-exists --table-name "PortfolioProjects-prod" --region $REGION  
aws dynamodb wait table-exists --table-name "PortfolioRecruiterProfiles-prod" --region $REGION

echo "✅ All production tables created successfully!"
echo ""
echo "Tables created:"
echo "- PortfolioDevelopers-prod (id: STRING)"
echo "- PortfolioProjects-prod (id: STRING, GSI: byDeveloperId[developerId:STRING, order:NUMBER])"
echo "- PortfolioRecruiterProfiles-prod (linkId: STRING)"
echo ""
echo "You can now deploy the production API stack."