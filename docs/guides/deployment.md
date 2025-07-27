# Deployment Guide

This guide provides step-by-step instructions for deploying the AI Portfolio application.

## Quick Start

**For most deployments, use the main deploy command:**

```bash
# Deploy to development environment
pnpm deploy:dev

# Deploy to production environment (currently disabled)
pnpm deploy:prod
```

> **Note**: The deploy command runs the `scripts/deploy.sh` script which handles
> the entire local deployment pipeline automatically. The detailed steps below are
> provided for understanding what happens behind the scenes.

## Deployment Workflows

The application supports two deployment workflows:

1. **Local Deployment**: Manual deployment from your local machine
2. **CI/CD Pipeline**: Automated deployment via GitHub Actions and AWS CodePipeline

## Understanding the Deployment Process

The following sections explain what happens when you run `pnpm deploy:dev`. These steps are automated by the deployment script, but understanding them helps with troubleshooting and customization.

### Step 1: Set Up Environment Files

Create and configure the environment files:

```bash
# Copy example files if they don't exist
cp infrastructure/.env.example infrastructure/.env
cp infrastructure/.env.dev.example infrastructure/.env.dev
cp infrastructure/.env.prod.example infrastructure/.env.prod

# Edit the files with your specific values
nano infrastructure/.env
nano infrastructure/.env.dev
nano infrastructure/.env.prod
```

Required variables:

- `ENVIRONMENT`: Deployment environment (dev, prod)
- `BEDROCK_MODEL_ID`: AWS Bedrock model ID
- `DATA_BUCKET_NAME`: S3 bucket name for static data
- `DEVELOPER_TABLE_NAME`: DynamoDB table name for developer data
- `PROJECTS_TABLE_NAME`: DynamoDB table name for projects data
- `RECRUITER_PROFILES_TABLE_NAME`: DynamoDB table name for recruiter profiles
- `VISITOR_TABLE_NAME`: DynamoDB table name for visitors

For production, also add:

- `PROD_DOMAIN_NAME`: Domain name for production
- `CERTIFICATE_ARN`: Certificate ARN for production

### Step 2: Upload Parameters to SSM

```bash
# For development environment
pnpm upload-ssm-params:dev

# For production environment
pnpm upload-ssm-params:prod
```

> **Note**: The upload command now shows you exactly which parameters will be
> deleted before asking for confirmation, ensuring you can make an informed
> decision about the cleanup process.

### Step 3: Upload Static Data

```bash
# For development environment
pnpm upload-static-data:dev

# For production environment
pnpm upload-static-data:prod
```

### Step 4: Deploy Infrastructure

```bash
# For development environment
cd infrastructure
pnpm run provision:dev
cd ..

# For production environment
cd infrastructure
pnpm run provision:prod
cd ..
```

### Step 5: Generate Service Environment Files

```bash
# For development environment
cd infrastructure
pnpm run export-ssm-params:dev
# Or using CLI directly:
# ssm-params export --target=frontend --output --verbose
# ssm-params export --target=link-generator --output --verbose
cd ..

# For production environment
cd infrastructure
pnpm run export-ssm-params:prod
# Or using CLI directly:
# ssm-params export --target=frontend --output --verbose
# ssm-params export --target=link-generator --output --verbose
cd ..
```

### Step 6: Build and Deploy Frontend

```bash
# For development environment
cd frontend
NEXT_PUBLIC_ENVIRONMENT=dev pnpm build
cd ..
cd infrastructure
pnpm run publish-web-app:dev
# Or using CLI directly: web-app-publish
cd ..

# For production environment
cd frontend
NEXT_PUBLIC_ENVIRONMENT=prod pnpm build
cd ..
cd infrastructure
pnpm run publish-web-app:prod
# Or using CLI directly: web-app-publish
cd ..
```

### Step 7: Invalidate CloudFront Cache

```bash
cd infrastructure
pnpm run invalidate-cloudfront:dev  # or :prod
# Or using CLI directly: invalidate-cloudfront-distribution
cd ..
```

## CI/CD Pipeline Deployment

### Step 1: Set Up GitHub Repository

1. Push your code to GitHub
2. Configure branch protection for `dev` and `main` branches

### Step 2: Store GitHub Token

```bash
# Store GitHub token in AWS Secrets Manager
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub token for CodePipeline" \
  --secret-string "your-github-token" \
  --region us-east-1

# Add GitHub info to infrastructure/.env
echo "GITHUB_OWNER=your-github-username" >> infrastructure/.env
echo "GITHUB_REPO=ai-portfolio" >> infrastructure/.env
```

### Step 3: Deploy Pipeline Infrastructure

```bash
# Deploy development pipeline
pnpm deploy:dev

# Deploy production pipeline
pnpm deploy:prod
```

### Step 4: Trigger Deployments

- **Development**: Merge a pull request to the `dev` branch
- **Production**: Merge a pull request to the `main` branch

## Component Deployment

If you need to deploy specific components:

### Parameters Only

```bash
# Upload parameters
pnpm upload-ssm-params:dev

# Export parameters
pnpm export-ssm-params:dev

# Sync service parameters from deployed stacks
pnpm sync-service-params:dev
```

### Static Data Only

```bash
# Upload static data
pnpm upload-static-data:dev

# Download static data
pnpm download-static-data:dev
```

### Frontend Only

```bash
# Publish frontend only (skips infrastructure provisioning)
pnpm publish-frontend:dev
```

> **Use Case**: When you've made changes to the frontend code and want to quickly
> update the deployed website without reprovisioning the infrastructure.
> This is much faster than a full deployment for iterative development.
>
> **What it does**:
>
> - Generates frontend environment variables from SSM
> - Builds the Next.js application
> - Uploads built files to S3
> - Invalidates CloudFront cache

### Stack Outputs

```bash
# Get CloudFront domain
cd infrastructure
pnpm run stack-outputs:web:dev CloudfrontDomain
# Or using CLI directly: stack-outputs web CloudfrontDomain
cd ..
```

### Service Parameter Sync

```bash
# Preview service parameter sync
pnpm sync-service-params-dry-run:dev

# Sync service parameters
pnpm sync-service-params:dev

# Sync and cleanup obsolete parameters
pnpm sync-service-params-cleanup:dev
```

## Troubleshooting

### Common Issues

| Issue                                                            | Cause                                         | Solution                              |
| ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| "Missing required environment variables"                         | Pre-deployment parameters not uploaded to SSM | Run `pnpm upload-ssm-params:dev`      |
| "Parameter not found: /portfolio/dev/CLOUDFRONT_DISTRIBUTION_ID" | Infrastructure deployment failed              | Re-deploy infrastructure              |
| "No access token available in deployed environment"              | Wrong environment variable                    | Check `NEXT_PUBLIC_ENVIRONMENT` value |

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

## Related Documentation

- [Environment Variables Reference](../reference/environment-variables.md)
- [Commands Reference](../reference/commands.md)
- [Infrastructure Architecture](../architecture/infrastructure/overview.md)
