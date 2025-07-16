#!/bin/bash

# Cleanup script to delete resources that might conflict with CloudFormation deployment
# Usage: ./cleanup-resources.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Error: Environment must be either 'dev' or 'prod'"
  exit 1
fi

echo "🧹 Cleaning up resources for $ENVIRONMENT environment..."

# Resources to clean up
DYNAMO_TABLE="PortfolioVisitorLinks-$ENVIRONMENT"
LAMBDA_FUNCTION="visitor-context-$ENVIRONMENT"
S3_BUCKET_PREFIX="portfolio-web-$ENVIRONMENT"

# Regions to check
REGIONS=("us-east-1" "eu-central-1")

# Cleanup DynamoDB tables
echo -e "\n🗄️  Cleaning up DynamoDB tables..."
for REGION in "${REGIONS[@]}"; do
  echo "  → Checking for table $DYNAMO_TABLE in $REGION..."
  
  # Check if table exists
  if aws dynamodb describe-table --table-name "$DYNAMO_TABLE" --region "$REGION" &>/dev/null; then
    echo "  → Deleting table $DYNAMO_TABLE in $REGION..."
    aws dynamodb delete-table --table-name "$DYNAMO_TABLE" --region "$REGION" || echo "  ❌ Failed to delete table"
    echo "  ✓ Table deletion initiated"
  else
    echo "  → Table $DYNAMO_TABLE not found in $REGION"
  fi
done

# Cleanup Lambda functions
echo -e "\n🧩 Cleaning up Lambda functions..."
for REGION in "${REGIONS[@]}"; do
  echo "  → Checking for function $LAMBDA_FUNCTION in $REGION..."
  
  # Check if function exists
  if aws lambda get-function --function-name "$LAMBDA_FUNCTION" --region "$REGION" &>/dev/null; then
    echo "  → Checking for Lambda@Edge replicas..."
    
    # For Lambda@Edge functions, we need to check if they're associated with CloudFront
    VERSIONS=$(aws lambda list-versions-by-function --function-name "$LAMBDA_FUNCTION" --region "$REGION" --query "Versions[*].Version" --output text)
    
    echo "  ⚠️  Found Lambda@Edge function $LAMBDA_FUNCTION in $REGION"
    echo "  ⚠️  This function may have replicas that cannot be deleted immediately"
    echo "  ⚠️  AWS will automatically delete replicas within a few hours"
    echo "  ⚠️  To speed up this process:"
    echo "  ⚠️  1. Update the CloudFront distribution to remove the Lambda@Edge association"
    echo "  ⚠️  2. Wait for CloudFront to propagate changes (15-30 minutes)"
    echo "  ⚠️  3. Then try to delete the function again"
    
    # Try to delete anyway, but it will likely fail for replicated functions
    aws lambda delete-function --function-name "$LAMBDA_FUNCTION" --region "$REGION" 2>/dev/null || true
  else
    echo "  → Function $LAMBDA_FUNCTION not found in $REGION"
  fi
done

# Cleanup S3 buckets
echo -e "\n🪣 Cleaning up S3 buckets..."
for REGION in "${REGIONS[@]}"; do
  echo "  → Checking for buckets with prefix $S3_BUCKET_PREFIX in $REGION..."
  
  # List buckets with the prefix
  BUCKETS=$(aws s3api list-buckets --query "Buckets[?contains(Name, '$S3_BUCKET_PREFIX')].Name" --output text --region "$REGION")
  
  if [[ -n "$BUCKETS" ]]; then
    for BUCKET in $BUCKETS; do
      echo "  → Emptying bucket $BUCKET..."
      aws s3 rm s3://$BUCKET --recursive --region "$REGION" || echo "  ❌ Failed to empty bucket"
      
      echo "  → Deleting bucket $BUCKET..."
      aws s3api delete-bucket --bucket "$BUCKET" --region "$REGION" || echo "  ❌ Failed to delete bucket"
      echo "  ✓ Bucket deletion initiated"
    done
  else
    echo "  → No buckets found with prefix $S3_BUCKET_PREFIX in $REGION"
  fi
done

echo -e "\n✅ Cleanup completed. You can now deploy the stack."