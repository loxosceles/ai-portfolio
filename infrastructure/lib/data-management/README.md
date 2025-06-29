# Data Management

This directory contains utilities for managing portfolio data across different environments.

## Overview

The data management system handles:

1. Creating S3 buckets for storing environment data
2. Uploading data files to S3
3. Loading data from S3 to DynamoDB during deployment

## Directory Structure

```
/data-management/
  create-bucket.mjs       - Create S3 bucket
  upload-data.mjs         - Upload data to S3
  validate-data.mjs       - Shared data validation logic
  update-env.mjs          - Update environment variables from SSM
  /data/                  - Data files for different environments
    /dev/                 - Development data
      projects.json
      developer.json
    /prod/                - Production data (gitignored)
      projects.json
      developer.json
  README.md               - Documentation
```

## Setup

1. Ensure your `.env` file at the project root contains:

   ```
   PROD_DATA_BUCKET_NAME=portfolio-production-data
   DEV_DATA_BUCKET_NAME=portfolio-development-data
   AWS_ACCOUNT_ID=your-account-id
   AWS_ADMIN_ARN=arn:aws:iam::your-account-id:user/your-username
   AWS_REGION=eu-central-1
   ```

2. Create the production data directory and files:

   ```bash
   mkdir -p data/prod
   cp data/dev/projects.json data/prod/
   cp data/dev/developer.json data/prod/
   ```

   Then edit the production data files with your actual production data.

## Available Scripts

Run these scripts from the infrastructure directory:

### Create Data Bucket

Creates an S3 bucket for storing environment data:

```bash
# Create development bucket
pnpm run create-bucket:dev

# Create production bucket
pnpm run create-bucket:prod
```

### Upload Data

Uploads environment data to S3:

```bash
# Upload development data
pnpm run upload-data:dev

# Upload production data
pnpm run upload-data:prod
```

### Complete Setup

Performs both bucket creation and data upload:

```bash
# Setup development environment
pnpm run setup-data:dev

# Setup production environment
pnpm run setup-data:prod
```

### Update Environment Variables

Retrieves environment variables from SSM Parameter Store and updates local files:

```bash
# Update all environment files
pnpm run update-env:dev
pnpm run update-env:prod

# Update only frontend environment
pnpm run update-env:frontend:dev
pnpm run update-env:frontend:prod

# Update only link generator environment
pnpm run update-env:link-generator:dev
pnpm run update-env:link-generator:prod
```

## Data Management

- Development data is committed to the repository for shared development environments
- Production data is gitignored to prevent sensitive information from being committed
- Both environments use the same data structure and loading mechanism
- Data validation ensures referential integrity between developers and projects

## Notes

- The bucket is created with deletion protection to prevent accidental data loss
- Only the IAM user/role specified in AWS_ADMIN_ARN can delete objects
