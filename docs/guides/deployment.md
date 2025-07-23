# Deployment Guide

This guide provides step-by-step instructions for deploying the AI Portfolio application.

## Quick Start

```bash
# Deploy to development environment
pnpm deploy:dev

# Deploy to production environment
pnpm deploy:prod
```

## Deployment Workflows

The application supports two deployment workflows:

1. **Local Deployment**: Manual deployment from your local machine
2. **CI/CD Pipeline**: Automated deployment via GitHub Actions and AWS CodePipeline

## Local Deployment

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
pnpm upload-stack-params:dev

# For production environment
pnpm upload-stack-params:prod
```

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
pnpm run export-stack-params:dev
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output
cd ..

# For production environment
cd infrastructure
pnpm run export-stack-params:prod
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output
cd ..
```

### Step 6: Build and Deploy Frontend

```bash
# For development environment
cd frontend
pnpm run build
cd ..
cd infrastructure
pnpm run publish:web-app
cd ..

# For production environment
cd frontend
pnpm run build
cd ..
cd infrastructure
pnpm run publish:web-app
cd ..
```

### Step 7: Invalidate CloudFront Cache

```bash
cd infrastructure
pnpm run invalidate:cloudfront
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
pnpm upload-stack-params:dev

# Download parameters
pnpm download-stack-params:dev
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
# Deploy frontend only
pnpm deploy:frontend:dev
```

## Troubleshooting

### Common Issues

| Issue                                                            | Cause                                         | Solution                              |
| ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------- |
| "Missing required environment variables"                         | Pre-deployment parameters not uploaded to SSM | Run `pnpm upload-stack-params:dev`    |
| "Parameter not found: /portfolio/dev/CLOUDFRONT_DISTRIBUTION_ID" | Infrastructure deployment failed              | Re-deploy infrastructure              |
| "No access token available in deployed environment"              | Wrong environment variable                    | Check `NEXT_PUBLIC_ENVIRONMENT` value |

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

## Related Documentation

- [Environment Variables Reference](../reference/environment-variables.md)
- [Commands Reference](../reference/commands.md)
- [Infrastructure Architecture](../architecture/infrastructure/overview.md)
