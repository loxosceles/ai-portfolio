# Configuration Reference

This document provides a reference for all configuration files used in the AI Portfolio application.

## Configuration Systems

The application uses two complementary configuration systems:

1. **Environment Variables**: Dynamic, potentially sensitive values stored in `.env` files and SSM Parameter Store
   - **Manual Configuration Files**: `.env`, `.env.dev`, `.env.prod` (source of truth, manually edited)
   - **Generated Service Files**: `frontend/.env.local`, `link-generator/.env` (auto-generated from stack outputs)

2. **TypeScript Configuration Objects**: Static configuration like regions, paths, and naming conventions
   - Defined in `configs/aws-config.ts`, `configs/env-config.ts`, and `configs/base.ts`
   - Used by core managers for consistent configuration across the application

This dual approach provides several benefits:

- Separation of sensitive values (environment variables) from code configuration
- Type safety for configuration objects used throughout the codebase
- Flexibility to change environment-specific values without code changes
- Consistent configuration across local development and CI/CD pipelines

## Infrastructure Configuration

### AWS Configuration (`configs/aws-config.ts`)

The AWS configuration defines AWS-specific settings for the infrastructure:

```typescript
// Service regions
export const SERVICE_REGIONS = {
  cloudfront: 'us-east-1',
  web: 'us-east-1',
  api: 'eu-central-1',
  data: 'eu-central-1'
};

// Parameter schema by stage/region
export const PARAMETER_SCHEMA = {
  dev: {
    'eu-central-1': ['BEDROCK_MODEL_ID', 'CDK_DEFAULT_ACCOUNT', ...],
    'us-east-1': ['VISITOR_TABLE_NAME']
  },
  prod: {
    'eu-central-1': ['BEDROCK_MODEL_ID', 'CDK_DEFAULT_ACCOUNT', ...],
    'us-east-1': ['CERTIFICATE_ARN', 'PROD_DOMAIN_NAME', 'VISITOR_TABLE_NAME']
  }
};

// Stack naming
export const STACK_NAMING = {
  web: (stage) => `portfolio-web-${stage}`,
  api: (stage) => `portfolio-api-${stage}`,
  shared: (stage) => `portfolio-shared-${stage}`
};
```

### Environment Configuration (`configs/env-config.ts`)

The environment configuration defines environment-specific settings for the infrastructure:

```typescript
// Infrastructure environment file paths
export const INFRASTRUCTURE_ENV_PATHS = {
  base: 'infrastructure/.env',
  stage: (stage) => `infrastructure/.env.${stage}`,
  runtime: 'infrastructure/.env' // For CI/CodeBuild environments
};

// Service configurations
export const SERVICE_CONFIGS = {
  frontend: {
    envPath: 'frontend/.env.local',
    requiredParams: [
      'APPSYNC_API_KEY',
      'APPSYNC_URL',
      'AWS_REGION_DEFAULT',
      'COGNITO_CLIENT_ID',
      'COGNITO_DOMAIN_NAME',
      'COGNITO_AUTHORITY',
      'COGNITO_USER_POOL_ID'
    ],
    prefix: 'NEXT_PUBLIC_',
    additionalParams: {}
  },
  'link-generator': {
    envPath: 'link-generator/.env',
    requiredParams: [
      'VISITOR_TABLE_NAME',
      'COGNITO_USER_POOL_ID',
      'COGNITO_CLIENT_ID',
      'CLOUDFRONT_DOMAIN'
    ],
    prefix: '',
    additionalParams: {
      AWS_REGION_DISTRIB: 'us-east-1',
      AWS_REGION_DEFAULT: 'eu-central-1',
      OUTPUT_FILE_PATH: './link.txt'
    }
  }
};
```

### Base Configuration (`configs/base.ts`)

The base configuration defines common settings for the infrastructure:

```typescript
// Project root
export const projectRoot = path.resolve(__dirname, '../..');

// Supported stages
export const SUPPORTED_STAGES = ['dev', 'prod'];

// Default stage
export const DEFAULT_STAGE = 'dev';
```

## Frontend Configuration

### Next.js Configuration (`frontend/next.config.ts`)

The Next.js configuration defines settings for the Next.js application:

```typescript
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true
  }
  // ... other Next.js configuration
};

export default nextConfig;
```

### TypeScript Configuration (`frontend/tsconfig.json`)

The TypeScript configuration defines settings for the TypeScript compiler:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "next.config.ts",
    "tailwind.config.ts"
  ],
  "exclude": ["node_modules", ".next", "out", "dist", "build", "coverage"]
}
```

## Link Generator Configuration

### Link Generator Configuration (`link-generator/.env`)

The link generator configuration defines settings for the link generator tool:

```
VISITOR_TABLE_NAME=portfolio-visitors-dev
COGNITO_USER_POOL_ID=eu-central-1_xxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFRONT_DOMAIN=xxxxxxxxxx.cloudfront.net
AWS_REGION_DISTRIB=us-east-1
AWS_REGION_DEFAULT=eu-central-1
OUTPUT_FILE_PATH=./link.txt
```

## CI/CD Configuration

The application uses a combination of GitHub Actions and AWS CodePipeline for CI/CD:

### GitHub Actions Workflow (`trigger-pipeline.yml`)

This workflow triggers the AWS CodePipeline when pull requests are merged to specific branches:

```yaml
name: Trigger AWS Pipeline

on:
  pull_request:
    types: [closed]
    branches: [dev, main]

jobs:
  trigger-pipeline:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-central-1

      - name: Trigger Dev Pipeline
        if: github.base_ref == 'dev'
        run: |
          echo "Triggering dev pipeline for PR merge to dev branch"
          aws codepipeline start-pipeline-execution --name portfolio-pipeline-dev

      - name: Trigger Prod Pipeline
        if: github.base_ref == 'main'
        run: |
          echo "Triggering prod pipeline for PR merge to main branch"
          aws codepipeline start-pipeline-execution --name portfolio-pipeline-prod
```

### Buildspec Configuration (`buildspec.yml`)

The buildspec configuration defines the CI/CD pipeline for AWS CodeBuild:

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm install -g pnpm
      - pnpm install

  pre_build:
    commands:
      # Fetch pre-deployment parameters from SSM
      - cd infrastructure && pnpm run download-ssm-params:$ENVIRONMENT && cd ..
      # Deploy infrastructure (validates parameters automatically)
      - cd infrastructure && pnpm run provision:$ENVIRONMENT && cd ..

  build:
    commands:
      # Setup data buckets
      - cd infrastructure && pnpm run populate-static-data:$ENVIRONMENT && cd ..
      # Update environment files with post-deployment parameters
      - cd infrastructure && ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output && cd ..
      - cd infrastructure && ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output && cd ..
      # Build and deploy frontend
      - cd frontend && pnpm run build && cd ..
      - cd infrastructure && pnpm run publish:web-app && cd ..

  post_build:
    commands:
      # Invalidate CloudFront cache
      - cd infrastructure && pnpm run invalidate:cloudfront && cd ..

artifacts:
  files:
    - appspec.yml
    - buildspec.yml
    - package.json
    - pnpm-lock.yaml
    - pnpm-workspace.yaml
    - '**/*'
  base-directory: '.'
```

## Configuration Flow

The configuration flow in the application follows these steps:

1. **Manual Configuration**: `.env`, `.env.dev`, and `.env.prod` files are manually created and maintained as the source of truth

2. **Parameter Upload**: Parameters from these files are uploaded to SSM Parameter Store using the `upload-stack-params` command

3. **Infrastructure Deployment**: CDK stacks are deployed using these parameters and generate additional outputs

4. **Service Environment Generation**: After deployment, service-specific environment files are generated from SSM parameters:
   - `frontend/.env.local`: Generated with `NEXT_PUBLIC_` prefix for frontend use
   - `link-generator/.env`: Generated for the link generator tool

5. **Runtime Configuration**: Applications read environment variables from these generated files

This approach ensures consistent configuration across environments while keeping sensitive values secure in SSM Parameter Store.
