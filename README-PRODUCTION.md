# Production Deployment Guide

This document outlines the steps for setting up and deploying the production environment for the AI Portfolio Frontend project.

## Production Data Setup

The production data is stored in an S3 bucket separate from the codebase to keep personal data out of the repository.

### 1. Set up environment variables

Ensure your `.env` file contains the following entries:

```
# AWS Production Data Bucket
PROD_DATA_BUCKET_NAME=portfolio-production-data
AWS_ACCOUNT_ID=your-account-id
AWS_ADMIN_ARN=arn:aws:iam::your-account-id:user/your-username
AWS_REGION=eu-central-1
```

### 2. Create the production data bucket

Run the script to create a versioned, delete-protected S3 bucket:

```bash
./scripts/create-prod-data-bucket.sh
```

This creates an S3 bucket with:

- Versioning enabled
- Public access blocked
- Deletion protection (only the specified admin ARN can delete objects)

### 3. Prepare your production data

Edit the JSON files in the `production-data` directory:

- `production-data/projects.json`
- `production-data/developer.json`

### 4. Upload your production data

Run the script to upload your production data to S3:

```bash
./scripts/upload-prod-data.sh
```

## Production Deployment

The production deployment uses AWS CodePipeline to automate the process.

### 1. Deploy the pipeline stack

```bash
npx cdk deploy PortfolioPipeline-prod --context environment=prod
```

### 2. Pipeline stages

The pipeline automatically:

1. Pulls code from your repository
2. Builds the application
3. Deploys infrastructure with CDK
4. Loads production data from S3 into DynamoDB
5. Verifies the deployment

## Updating Production Data

To update your production data:

1. Edit the files in the `production-data` directory
2. Run the upload script again:
   ```bash
   node scripts/upload-prod-data.mjs
   ```
3. Trigger a new pipeline run or manually run the data loading step:
   ```bash
   node infrastructure/deploy/loadData.mjs
   ```

## Notes

- The production data bucket is created outside of CDK to ensure it's never accidentally deleted
- The bucket is located in `eu-central-1` while some frontend resources are in `us-east-1`
- The data loading script handles this cross-region setup automatically
