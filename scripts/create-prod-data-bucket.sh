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

# Check required environment variables
if [[ -z "$AWS_ACCOUNT_ID" ]]; then
  echo "Error: AWS_ACCOUNT_ID is required in .env file"
  exit 1
fi

if [[ -z "$AWS_ADMIN_ARN" ]]; then
  echo "Error: AWS_ADMIN_ARN is required in .env file"
  exit 1
fi

# Set defaults if not provided
BUCKET_NAME=${PROD_DATA_BUCKET_NAME:-"portfolio-production-data"}
REGION=${AWS_REGION:-"eu-central-1"}

echo "Creating bucket $BUCKET_NAME in $REGION..."

# Create bucket with LocationConstraint for eu-central-1
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

if [[ $? -ne 0 ]]; then
  echo "Error creating bucket"
  exit 1
fi

echo "Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

echo "Blocking public access..."
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "Adding deletion protection policy..."
# Create policy JSON with proper variable substitution
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDelete",
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "s3:DeleteBucket",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": "$AWS_ADMIN_ARN"
        }
      }
    }
  ]
}
EOF
)

# Apply the policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy "$POLICY"

echo "✅ Production data bucket $BUCKET_NAME created successfully in $REGION"
echo ""
echo "Next steps:"
echo "1. Create your production data JSON files"
echo "2. Upload them using: ./scripts/upload-prod-data.sh"