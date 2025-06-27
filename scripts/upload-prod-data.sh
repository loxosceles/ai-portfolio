#!/bin/zsh

# Determine script directory and project root
SCRIPT_DIR="${0:a:h}"
PROJECT_ROOT="${SCRIPT_DIR:h}"

# Load environment variables from .env file
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  source "$PROJECT_ROOT/.env"
  echo "Loaded environment from $PROJECT_ROOT/.env"
else
  echo "Error: .env file not found at $PROJECT_ROOT/.env"
  exit 1
fi

# Set defaults if not provided
BUCKET_NAME=${PROD_DATA_BUCKET_NAME:-"portfolio-production-data"}
REGION=${AWS_REGION:-"eu-central-1"}
ENVIRONMENT="prod"

# Check if production data files exist
if [[ ! -f "$PROJECT_ROOT/production-data/projects.json" ]]; then
  echo "Error: projects.json not found in production-data directory"
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/production-data/developer.json" ]]; then
  echo "Error: developer.json not found in production-data directory"
  exit 1
fi

echo "Uploading production data to S3 bucket $BUCKET_NAME in $REGION..."

# Upload projects data
echo "Uploading projects data..."
aws s3 cp "$PROJECT_ROOT/production-data/projects.json" s3://$BUCKET_NAME/$ENVIRONMENT/projects.json \
  --region $REGION

if [[ $? -ne 0 ]]; then
  echo "Error uploading projects data"
  exit 1
fi

# Upload developer data
echo "Uploading developer data..."
aws s3 cp "$PROJECT_ROOT/production-data/developer.json" s3://$BUCKET_NAME/$ENVIRONMENT/developer.json \
  --region $REGION

if [[ $? -ne 0 ]]; then
  echo "Error uploading developer data"
  exit 1
fi

echo "✅ Production data uploaded successfully to s3://$BUCKET_NAME/$ENVIRONMENT/"