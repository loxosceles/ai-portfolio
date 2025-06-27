# Production Data Management Scripts

This directory contains shell scripts for managing production data in S3.

## Setup

1. Ensure your `.env` file at the project root contains:

   ```
   PROD_DATA_BUCKET_NAME=portfolio-production-data
   AWS_ACCOUNT_ID=your-account-id
   AWS_ADMIN_ARN=arn:aws:iam::your-account-id:user/your-username
   AWS_REGION=eu-central-1
   ```

2. Make sure the AWS CLI is installed and configured with appropriate credentials.

## Available Scripts

### Create Production Data Bucket

Creates an S3 bucket for storing production data with proper security settings:

```bash
./create-prod-data-bucket.sh
```

Features:

- Creates bucket in eu-central-1
- Enables versioning
- Blocks public access
- Adds deletion protection (only specified admin can delete)

### Upload Production Data

Uploads your production data to S3:

```bash
./upload-prod-data.sh
```

This script uploads:

- `../production-data/projects.json` → `s3://your-bucket/prod/projects.json`
- `../production-data/developer.json` → `s3://your-bucket/prod/developer.json`

## Notes

- The LocationConstraint parameter is required when creating buckets outside us-east-1
- The bucket is created with deletion protection to prevent accidental data loss
- Only the IAM user/role specified in AWS_ADMIN_ARN can delete objects
- These scripts use zsh and require the AWS CLI to be installed
