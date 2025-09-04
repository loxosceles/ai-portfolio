# Deployment Guide

This guide provides step-by-step instructions for deploying the AI Portfolio application.

> **Note**: This guide uses pnpm scripts with double dash parameter passing. For example, `pnpm export-ssm-params:dev -- --target=frontend` passes the `--target=frontend` parameter to the underlying CLI tool. See the [Commands Reference](../reference/commands.md#double-dash-parameter-passing) for details.

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
cd ..

# For production environment
cd infrastructure
pnpm run export-ssm-params:prod
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
cd ..

# For production environment
cd frontend
NEXT_PUBLIC_ENVIRONMENT=prod pnpm build
cd ..
cd infrastructure
pnpm run publish-web-app:prod
cd ..
```

### Step 7: Invalidate CloudFront Cache

```bash
cd infrastructure
pnpm run invalidate-cloudfront:dev  # or :prod
cd ..
```

## Automatic Versioning

The application automatically manages version numbers and git tags when PRs are merged to the `main` branch.

### How It Works

1. **Pre-merge validation**: `validate-version-label.yml` workflow runs on PR events
2. **Label enforcement**: Branch protection requires exactly one version label (`major`, `minor`, `patch`)
3. **Post-merge versioning**: `version-and-tag.yml` workflow runs after successful merge
4. **Pipeline trigger**: `trigger-pipeline.yml` workflow runs after versioning completes

### GitHub Actions Workflows

#### Validate Version Label

- **File**: `.github/workflows/validate-version-label.yml`
- **Triggers**: PR opened, synchronized, labeled, unlabeled (targeting `main`)
- **Purpose**: Validates exactly one version label exists
- **Result**: Shows as required status check in branch protection

#### Version and Tag

- **File**: `.github/workflows/version-and-tag.yml`
- **Triggers**: PR merged to `main`
- **Purpose**: Bumps version in `package.json` and creates git tag
- **Logic**:
  - `patch`: 0.2.6 → 0.2.7
  - `minor`: 0.2.6 → 0.3.0
  - `major`: 0.2.6 → 1.0.0

#### Trigger Pipeline

- **File**: `.github/workflows/trigger-pipeline.yml`
- **Triggers**: After version workflow completes OR direct PR merge to `dev`
- **Purpose**: Starts AWS CodePipeline deployment

### Branch Protection Setup

1. **Go to**: GitHub Settings → Branches → Add rule for `main`
2. **Enable**: "Require status checks to pass before merging"
3. **Add**: "Validate Version Label" as required status check
4. **Result**: Prevents merges without proper version labels

### Version Management

- **Single source of truth**: Version stored only in root `package.json`
- **Version format**: Semantic versioning (`MAJOR.MINOR.PATCH`)
  - Package.json: `1.2.3` (no prefix)
  - Git tags: `v1.2.3` (with "v" prefix)
  - Validation: Numbers only, no pre-release suffixes
- **Automatic tagging**: Git tags created as `v1.2.3` format
- **Sequential workflow**: Versioning → Deployment (no race conditions)

> **Developer Usage**: See [Development Workflow - Versioning Requirements](../contributing/development-workflow.md#versioning-requirements) for how to use version labels.

## CI/CD Pipeline Deployment

### Step 1: Set Up GitHub Repository

1. Push your code to GitHub
2. Configure branch protection for `dev` and `main` branches (see [Automatic Versioning](#automatic-versioning) for `main` branch setup)

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
pnpm run stack-outputs-web:dev CloudfrontDomain
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

## Testing Notes

The automatic versioning system has been implemented and is currently being tested.
