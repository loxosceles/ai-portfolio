# Deployment Pipeline Strategy

## Overview

This project uses a three-layer deployment architecture with automated CI/CD pipelines for both development and production environments.

## Architecture Layers

### Layer 1: Root Level Scripts (Developer Convenience)

- **Purpose**: Easy commands for developers
- **Location**: Root `package.json` and `scripts/deploy.sh`
- **Usage**: `pnpm run deploy:full:dev`, `./scripts/deploy.sh dev`
- **Audience**: Developers who want simple, memorable commands

### Layer 2: Workspace Scripts (Technical/Pipeline Interface)

- **Purpose**: Technical building blocks called by root scripts and CI/CD pipeline
- **Location**: `frontend/package.json`, `infrastructure/package.json`
- **Examples**: `deploy:dev`, `deploy:prod`, `build`
- **Audience**: CI/CD pipeline (buildspec.yml) and root-level scripts

### Layer 3: Workspace /scripts (Complex Logic - Future)

- **Purpose**: Handle complex logic without cluttering package.json
- **Location**: `frontend/scripts/`, `infrastructure/scripts/`
- **Usage**: Called by Layer 2 package.json scripts when needed

## CI/CD Pipeline Flow

### Trigger Mechanism

```yaml
# .github/workflows/trigger-pipeline.yml
on:
  pull_request:
    types: [closed]
    branches: [dev, main]
# Dev Pipeline: PR merge to 'dev' branch
# Prod Pipeline: PR merge to 'main' branch
```

### Pipeline Execution (buildspec.yml)

#### Environment Variable Override

- **Default**: `ENVIRONMENT: dev`
- **Dev Pipeline**: Sets `ENVIRONMENT=dev` via CodeBuild environment variables
- **Prod Pipeline**: Sets `ENVIRONMENT=prod` via CodeBuild environment variables

#### Deployment Steps

1. **Install Phase**

   ```yaml
   - Install Node.js 20
   - Clean node_modules
   - Install pnpm
   - Install dependencies
   ```

2. **Pre-build Phase**

   ```yaml
   - Deploy infrastructure: cd infrastructure && pnpm run deploy:$ENVIRONMENT
   ```

3. **Build Phase**

   ```yaml
   - Setup data buckets and download static data
   - Update environment variables (excluding NEXT_PUBLIC_ENVIRONMENT)
   - Build and deploy frontend: cd frontend && pnpm run deploy:$ENVIRONMENT
   - Deploy frontend infrastructure: cd infrastructure && pnpm run deploy:frontend:$ENVIRONMENT
   ```

4. **Post-build Phase**
   ```yaml
   - Invalidate CloudFront cache
   - Output deployment URL
   ```

## Environment Variable Strategy

### Frontend Environment Detection

- **Local Development**: `NEXT_PUBLIC_ENVIRONMENT=local` (set in dev script)
- **Dev Deployment**: `NEXT_PUBLIC_ENVIRONMENT=dev` (set in deploy:dev script)
- **Prod Deployment**: `NEXT_PUBLIC_ENVIRONMENT=prod` (set in deploy:prod script)

### Key Principle

Environment variables are **always prepended** as runtime variables, never read from `.env.local` file (which gets overwritten by deployment process).

## Authentication Logic

```typescript
// auth-utils.ts
export function getEnvironment(): Environment {
  return (process.env.NEXT_PUBLIC_ENVIRONMENT as Environment) || 'local';
}
```

- **Local (`local`)**: Uses URL parameter authentication (`?visitor=...`)
- **Deployed (`dev`/`prod`)**: Uses cookie-based authentication (AccessToken cookie)

## Workspace Script Structure

### Frontend Scripts

```json
{
  "dev": "NEXT_PUBLIC_ENVIRONMENT=local next dev",
  "build": "next build",
  "deploy:dev": "NEXT_PUBLIC_ENVIRONMENT=dev next build && aws s3 sync out/ s3://...",
  "deploy:prod": "NEXT_PUBLIC_ENVIRONMENT=prod next build && aws s3 sync out/ s3://..."
}
```

### Infrastructure Scripts

```json
{
  "deploy:dev": "ENVIRONMENT=dev npx cdk deploy --all --context stage=dev",
  "deploy:prod": "ENVIRONMENT=prod npx cdk deploy --all --context stage=prod",
  "deploy:frontend:dev": "ENVIRONMENT=dev npx cdk deploy PortfolioWebStack-dev",
  "deploy:frontend:prod": "ENVIRONMENT=prod npx cdk deploy PortfolioWebStack-prod"
}
```

## Local vs CI/CD Deployment

### Local Development Deployment

- **Method**: `scripts/deploy.sh` or root package.json scripts
- **Purpose**: Rapid iteration during development
- **Source**: Uses local code changes (may be uncommitted)
- **Sync Strategy**: AI-assisted manual sync with buildspec.yml

### CI/CD Pipeline Deployment

- **Method**: Automated via GitHub Actions → CodePipeline → CodeBuild
- **Purpose**: Controlled deployment of tested code
- **Source**: Uses committed code from git repository
- **Trigger**: PR merge to dev/main branches

## Safety Considerations

### Potential Risks

1. **Environment Misconfiguration**: Pipeline sets wrong ENVIRONMENT value
2. **Cross-Environment Deployment**: Prod pipeline accidentally deploys to dev
3. **Sync Drift**: Local scripts and buildspec.yml get out of sync

### Mitigation Strategies

1. **Pipeline Environment Variables**: Explicitly set in CodeBuild project configuration
2. **Clear Naming**: Pipeline names match environment (`portfolio-pipeline-dev/prod`)
3. **AI-Assisted Sync**: Manual sync between local scripts and buildspec.yml when changes needed

## Development Workflow

### Feature Development

1. Create feature branch from `dev`
2. Develop and test locally using `./scripts/deploy.sh dev`
3. Create PR to `dev` branch
4. PR merge triggers dev pipeline
5. Test in dev environment

### Production Release

1. Create PR from `dev` to `main`
2. PR merge triggers prod pipeline
3. Production deployment

## Key Files

- **buildspec.yml**: CI/CD deployment logic (single source of truth)
- **scripts/deploy.sh**: Local deployment convenience script
- **frontend/package.json**: Frontend build and deployment scripts
- **infrastructure/package.json**: Infrastructure deployment scripts
- **.github/workflows/trigger-pipeline.yml**: Pipeline trigger configuration

## Troubleshooting

### "No access token available in deployed environment"

- **Cause**: Frontend built with wrong `NEXT_PUBLIC_ENVIRONMENT` value
- **Solution**: Ensure workspace deploy scripts set correct environment variable
- **Check**: Verify pipeline environment variable override is working

### Pipeline Deploys to Wrong Environment

- **Cause**: CodeBuild project environment variables misconfigured
- **Solution**: Verify pipeline infrastructure deployment sets correct stage value
- **Check**: Pipeline logs should show correct ENVIRONMENT value
