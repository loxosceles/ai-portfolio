# CodePipeline Setup

## Quick Start

### 1. Prerequisites

Create GitHub token and store in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub token for CodePipeline" \
  --secret-string "your-github-token" \
  --region us-east-1
```

Add to `infrastructure/.env`:

```bash
GITHUB_OWNER=your-github-username
GITHUB_REPO=ai-portfolio-frontend
```

### 2. Deploy Pipeline

Use your existing deployment strategy:

```bash
# Deploy everything (CDK will detect what's new)
pnpm run deploy:dev
```

### 3. Test & Monitor

1. Make a commit to trigger the pipeline
2. Monitor at: AWS Console > CodePipeline > `portfolio-pipeline-dev`
3. Check CloudWatch logs: `/aws/codebuild/portfolio-build-dev`

## How It Works

- Pipeline uses your existing `buildspec.yml`
- Mirrors your manual deployment process exactly
- Triggers on GitHub commits via webhook
- Same permissions and environment as manual deployment

## Rollback

If issues arise, your manual deployment still works:

```bash
pnpm run deploy:dev
```
