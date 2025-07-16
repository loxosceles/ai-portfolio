# Environment Variable Strategy

This document explains the environment variable strategy used in the AI Portfolio application.

## Overview

Our approach to environment variables follows these principles:

1. **Source of Truth**: Manual configuration files (.env and .env.[stage]) are the source of truth.
2. **Local Development**: Uses local .env files directly.
3. **CodeBuild Pipeline**: Downloads parameters from SSM to create a combined .env file.
4. **Service Environment Files**: Generated after stack deployment with dynamic outputs.
5. **Access Pattern**: All services access variables via process.env after loading.

## File Structure

### Manual Configuration Files (Source of Truth)

- `infrastructure/.env`: Base environment variables shared across all stages
- `infrastructure/.env.dev`: Development stage-specific variables
- `infrastructure/.env.prod`: Production stage-specific variables

These files are manually edited and are NEVER automatically updated by any process.

### Generated Service Environment Files

- `frontend/.env.local`: Frontend environment variables
- `link-generator/.env`: Link generator environment variables

These files are automatically generated after stack deployment and contain dynamic outputs from the stack. They should never be manually edited.

## Workflows

### Local Development Workflow

1. **Environment Variable Loading**:

   - The `loadEnvFiles()` function loads both `.env` and `.env.dev` files
   - Variables are merged, with stage-specific variables taking precedence
   - All variables are loaded into `process.env`

2. **SSM Parameter Management**:

   - Before deployment, parameters must be uploaded to SSM Parameter Store
   - This is done using the `upload-stack-params` command

3. **Data Management**:

   - Static data must be uploaded to S3 before deployment
   - This is done using the `upload-static-data` command

4. **Service Environment File Generation**:
   - After stack deployment, service environment files are generated
   - This is done using the `generate-service-env` commands

### CodeBuild Workflow

1. **Environment Variable Loading**:

   - SSM parameters are downloaded to create a combined `.env` file
   - This file is loaded into `process.env`

2. **Data Management**:

   - Static data is downloaded from S3 during deployment
   - If data is missing, the deployment fails with a clear error message

3. **Service Environment File Generation**:
   - After stack deployment, service environment files are generated
   - This is done using the `generate-service-env` commands

## Access Pattern

All services follow this pattern for accessing environment variables:

```typescript
// Load environment variables
await loadEnvFiles();

// Validate required variables
if (!process.env.REQUIRED_VAR) {
  throw new Error('REQUIRED_VAR environment variable is not set');
}

// Use variables from process.env
const requiredVar = process.env.REQUIRED_VAR;
```

## Deployment Prerequisites

Before deployment, ensure that:

1. Manual configuration files are correctly set up
2. Parameters are uploaded to SSM Parameter Store
3. Static data is uploaded to S3

Only then can deployment succeed.

## Commands

### SSM Parameter Management

- `pnpm upload-stack-params:dev`: Upload parameters for dev stage
- `pnpm upload-stack-params:prod`: Upload parameters for prod stage
- `pnpm download-stack-params:dev`: Download parameters for dev stage
- `pnpm download-stack-params:prod`: Download parameters for prod stage

### Data Management

- `pnpm upload-static-data:dev`: Upload static data for dev stage
- `pnpm upload-static-data:prod`: Upload static data for prod stage
- `pnpm download-static-data:dev`: Download static data for dev stage
- `pnpm download-static-data:prod`: Download static data for prod stage

### Service Environment File Generation

- `pnpm generate-service-env:frontend:dev`: Generate frontend environment file for dev stage
- `pnpm generate-service-env:frontend:prod`: Generate frontend environment file for prod stage
- `pnpm generate-service-env:link-generator:dev`: Generate link-generator environment file for dev stage
- `pnpm generate-service-env:link-generator:prod`: Generate link-generator environment file for prod stage
