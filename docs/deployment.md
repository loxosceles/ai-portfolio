# Deployment Guide

## Prerequisites

Before deploying, ensure that:

1. **Environment Files**: Set up the required environment files:

   - `infrastructure/.env`: Base environment variables
   - `infrastructure/.env.dev`: Development stage-specific variables
   - `infrastructure/.env.prod`: Production stage-specific variables

2. **SSM Parameters**: Upload parameters to SSM Parameter Store:

   ```bash
   pnpm upload-stack-params:dev   # For development environment
   pnpm upload-stack-params:prod  # For production environment
   ```

3. **Static Data**: Upload static data to S3:
   ```bash
   pnpm upload-static-data:dev    # For development environment
   pnpm upload-static-data:prod   # For production environment
   ```

## Quick Start

```bash
# Deploy to development environment
pnpm deploy:dev

# Deploy to production environment
pnpm deploy:prod
```

## Overview

This application uses a sophisticated parameter management system that ensures consistent configuration across all environments and deployment methods. Parameters flow from `.env` files → SSM Parameter Store → Lambda environment variables and frontend builds.

## Parameter Management System

### Pre-Deployment Parameters

**Source**: `.env` files → **SSM Path**: `/portfolio/{env}/stack/`

These parameters are defined before deployment and used during infrastructure creation:

- Table names (`DEVELOPER_TABLE_NAME`, `PROJECTS_TABLE_NAME`, etc.)
- Model IDs (`BEDROCK_MODEL_ID`)
- Bucket names (`DATA_BUCKET_NAME`)
- Domain/Certificate info (prod only)

### Post-Deployment Parameters

**Source**: Stack resources → **SSM Path**: `/portfolio/{env}/`

These parameters are generated during deployment and used after infrastructure creation:

- Resource IDs (`CLOUDFRONT_DISTRIBUTION_ID`, `APPSYNC_URL`)
- Generated URLs (`CLOUDFRONT_DOMAIN`, `COGNITO_AUTHORITY`)
- Infrastructure info (`AWS_REGION_DEFAULT`)

## Deployment Methods

### 1. Local Deployment (Recommended for Development)

#### Quick Deploy

```bash
# Deploy everything
pnpm deploy:dev     # Development environment
pnpm deploy:prod    # Production environment
```

**What happens:**

1. ✅ Upload pre-deployment parameters to SSM (`upload-stack-params`)
2. ✅ Set up data in S3 buckets
3. ✅ Deploy infrastructure stacks (validates parameters)
4. ✅ Update local environment files from post-deployment SSM parameters
5. ✅ Build and deploy frontend with correct env vars
6. ✅ Seed data (dev environment only)
7. ✅ Invalidate CloudFront cache
8. ✅ Show deployment URL

#### Component Deployment

```bash
# Upload parameters to SSM
pnpm upload-stack-params:dev

# Deploy infrastructure only
pnpm run deploy:infra:dev

# Update environment files only
pnpm run update:env:dev

# Deploy frontend only
pnpm run deploy:frontend:dev
```

### 2. CI/CD Pipeline (Production Deployments)

#### Setup CodePipeline

**Prerequisites:**

```bash
# Store GitHub token in AWS Secrets Manager
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub token for CodePipeline" \
  --secret-string "your-github-token" \
  --region us-east-1

# Add to infrastructure/.env
GITHUB_OWNER=your-github-username
GITHUB_REPO=ai-portfolio-frontend
```

**Deploy Pipeline:**

```bash
# Deploy pipeline infrastructure
pnpm run deploy:dev  # Creates dev pipeline
pnpm run deploy:prod # Creates prod pipeline
```

#### Pipeline Triggers

- **Development**: Push to `develop` branch → triggers dev deployment
- **Production**: Push to `main` branch → triggers prod deployment
- **Manual**: AWS Console → CodePipeline → Release change

#### Pipeline Flow (buildspec.yml)

**pre_build** (Parameter Setup + Infrastructure):

```yaml
# Fetch pre-deployment parameters from SSM
cd infrastructure && pnpm run download-ssm-params:$ENVIRONMENT && cd ..

# Deploy infrastructure (validates parameters automatically)
cd infrastructure && pnpm run deploy:$ENVIRONMENT && cd ..
```

**build** (Data + Frontend):

```yaml
# Setup data buckets
cd infrastructure && pnpm run download-static-data:$ENVIRONMENT && cd ..

# Update environment files with post-deployment parameters
cd infrastructure && pnpm run generate-service-env:frontend:$ENVIRONMENT && cd ..
cd infrastructure && pnpm run generate-service-env:link-generator:$ENVIRONMENT && cd ..

# Build and deploy frontend
cd frontend && pnpm run deploy:$ENVIRONMENT && cd ..
```

**post_build** (Cache Invalidation):

```yaml
# Use post-deployment parameters for CloudFront invalidation
DISTRIBUTION_ID=$(aws ssm get-parameter \
--name "/portfolio/${ENVIRONMENT}/CLOUDFRONT_DISTRIBUTION_ID" \
--region us-east-1 --query 'Parameter.Value' --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

## Environment Configuration

### Configuration Files

- **Infrastructure**: `infrastructure/.env`, `infrastructure/.env.dev`, `infrastructure/.env.prod`
- **Frontend**: `frontend/.env.local` (auto-generated)
- **Link Generator**: `link-generator/.env` (auto-generated)

### Parameter Distribution by Region

**eu-central-1** (Main application region):

- All table names, Model IDs, Bucket names
- AppSync/Cognito resources

**us-east-1** (CloudFront/Lambda@Edge region):

- Visitor table name, CloudFront distribution ID/domain
- Certificate ARN (prod), Domain name (prod)

### Environment-Specific Parameters

**Development Environment:**

- Base parameters (table names, model ID, bucket name)
- No domain/certificate required

**Production Environment:**

- All development parameters
- `PROD_DOMAIN_NAME`, `CERTIFICATE_ARN`

## Helper Scripts

### Parameter Management

```bash
# Upload pre-deployment parameters to SSM
pnpm upload-stack-params:dev
pnpm upload-stack-params:prod --dry-run

# Download parameters from SSM
pnpm download-ssm-params:dev
pnpm download-ssm-params:prod
```

### Data Management

```bash
# Upload static data to S3
pnpm upload-static-data:dev
pnpm upload-static-data:prod

# Download static data from S3
pnpm download-static-data:dev
pnpm download-static-data:prod
```

### Service Environment Files

```bash
# Generate frontend environment file
pnpm generate-service-env:frontend:dev
pnpm generate-service-env:frontend:prod

# Generate link-generator environment file
pnpm generate-service-env:link-generator:dev
pnpm generate-service-env:link-generator:prod
```

### Local Deployment Scripts

```bash
pnpm deploy:dev           # Full deployment
pnpm deploy:prod          # Full production deployment
pnpm deploy:frontend:dev  # Frontend only
pnpm deploy:frontend:prod # Frontend only (production)
```

## Troubleshooting

### Parameter Issues

```bash
# Check if parameters exist in SSM
aws ssm get-parameters-by-path --path "/portfolio/dev/stack/" --region eu-central-1
aws ssm get-parameters-by-path --path "/portfolio/dev/" --region us-east-1

# Re-upload parameters if missing
pnpm upload-stack-params:dev
```

### Common Deployment Issues

**"Missing required environment variables"**:

```bash
# Cause: Pre-deployment parameters not uploaded to SSM
# Solution: Run pnpm upload-stack-params:dev
```

**"Parameter not found: /portfolio/dev/CLOUDFRONT_DISTRIBUTION_ID"**:

```bash
# Cause: Infrastructure deployment failed, post-deployment parameters not created
# Solution: Re-deploy infrastructure to generate parameters
```

**"No access token available in deployed environment"**:

```bash
# Cause: Frontend built with wrong NEXT_PUBLIC_ENVIRONMENT value
# Solution: Ensure deploy scripts set correct environment variable
```

### Manual Cache Invalidation

```bash
DISTRIBUTION_ID=$(aws ssm get-parameter \
  --name "/portfolio/dev/CLOUDFRONT_DISTRIBUTION_ID" \
  --region us-east-1 --query 'Parameter.Value' --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Pipeline Monitoring

```bash
# Monitor pipeline
# AWS Console > CodePipeline > portfolio-pipeline-dev

# Check build logs
# AWS Console > CloudWatch > Log groups > /aws/codebuild/portfolio-build-dev
```

## Architecture Summary

```
Parameter Flow:
.env files → upload-stack-params → SSM /stack/ → Stack Validation → Deployment
                                                        ↓
Stack Resources → addStackOutputs → SSM / → Environment Files → Frontend Build
```

**Key Benefits:**

- ✅ **Single source of truth**: All configuration in .env files
- ✅ **Environment isolation**: Parameters scoped by environment
- ✅ **Validation**: Missing parameters caught early
- ✅ **Consistency**: Same parameters across local and CI/CD
- ✅ **Debuggability**: Parameters visible in SSM Parameter Store

## Rollback Strategy

If CI/CD pipeline issues arise, manual deployment still works:

```bash
pnpm run deploy:dev  # Override pipeline deployment
```
