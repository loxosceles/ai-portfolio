# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the AI Portfolio application.

## Environment Variable System

The application uses a sophisticated environment variable management system that ensures:

1. **Single Source of Truth**: Manual configuration files are the source of truth
2. **Secure Storage**: Sensitive values stored in SSM Parameter Store
3. **Dynamic Generation**: Service-specific environment files generated from stack outputs
4. **Environment Isolation**: Clear separation between development and production environments

## File Structure

### Manual Configuration Files (Source of Truth)

- `infrastructure/.env`: Base environment variables shared across all stages
- `infrastructure/.env.dev`: Development stage-specific variables
- `infrastructure/.env.prod`: Production stage-specific variables

These files are manually edited and are NEVER automatically updated by any process.

### Generated Service Environment Files

- `frontend/.env.local`: Frontend environment variables (with `NEXT_PUBLIC_` prefix)
- `link-generator/.env`: Link generator environment variables

These files are automatically generated after stack deployment and contain dynamic outputs from the stack. They should never be manually edited.

## Environment Variables by Service

### Infrastructure

| Variable                        | Description                                | Required | Stage | Region       |
| ------------------------------- | ------------------------------------------ | -------- | ----- | ------------ |
| `ENVIRONMENT`                   | Deployment environment (dev, prod)         | Yes      | All   | All          |
| `BEDROCK_MODEL_ID`              | AWS Bedrock model ID                       | Yes      | All   | eu-central-1 |
| `DATA_BUCKET_NAME`              | S3 bucket name for static data             | Yes      | All   | eu-central-1 |
| `DEVELOPER_TABLE_NAME`          | DynamoDB table name for developer data     | Yes      | All   | eu-central-1 |
| `PROJECTS_TABLE_NAME`           | DynamoDB table name for projects data      | Yes      | All   | eu-central-1 |
| `RECRUITER_PROFILES_TABLE_NAME` | DynamoDB table name for recruiter profiles | Yes      | All   | eu-central-1 |
| `VISITOR_TABLE_NAME`            | DynamoDB table name for visitors           | Yes      | All   | us-east-1    |
| `PROD_DOMAIN_NAME`              | Domain name for production                 | Yes      | Prod  | us-east-1    |
| `CERTIFICATE_ARN`               | Certificate ARN for production             | Yes      | Prod  | us-east-1    |
| `GITHUB_OWNER`                  | GitHub repository owner                    | No       | All   | eu-central-1 |
| `GITHUB_REPO`                   | GitHub repository name                     | No       | All   | eu-central-1 |

### Frontend

| Variable                           | Description                  | Source        | Generated |
| ---------------------------------- | ---------------------------- | ------------- | --------- |
| `NEXT_PUBLIC_APPSYNC_API_KEY`      | AppSync API key              | Stack Output  | Yes       |
| `NEXT_PUBLIC_APPSYNC_URL`          | AppSync GraphQL endpoint URL | Stack Output  | Yes       |
| `NEXT_PUBLIC_AWS_REGION_DEFAULT`   | Default AWS region           | Static Config | Yes       |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID`    | Cognito client ID            | Stack Output  | Yes       |
| `NEXT_PUBLIC_COGNITO_DOMAIN_NAME`  | Cognito domain name          | Stack Output  | Yes       |
| `NEXT_PUBLIC_COGNITO_AUTHORITY`    | Cognito authority URL        | Stack Output  | Yes       |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool ID         | Stack Output  | Yes       |

### Link Generator

| Variable               | Description                      | Source        | Generated |
| ---------------------- | -------------------------------- | ------------- | --------- |
| `VISITOR_TABLE_NAME`   | DynamoDB table name for visitors | Stack Output  | Yes       |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID             | Stack Output  | Yes       |
| `COGNITO_CLIENT_ID`    | Cognito client ID                | Stack Output  | Yes       |
| `CLOUDFRONT_DOMAIN`    | CloudFront distribution domain   | Stack Output  | Yes       |
| `AWS_REGION_DISTRIB`   | AWS region for distribution      | Static Config | Yes       |
| `AWS_REGION_DEFAULT`   | Default AWS region               | Static Config | Yes       |
| `OUTPUT_FILE_PATH`     | Path for output file             | Static Config | Yes       |

## Parameter Distribution by Region

The application uses multiple AWS regions for different services:

### eu-central-1 (Main Region)

- AppSync API and resolvers
- Cognito user pool
- DynamoDB tables (except visitor table)
- AWS Bedrock integration

### us-east-1 (CloudFront Region)

- CloudFront distribution
- Lambda@Edge functions
- S3 bucket for frontend
- Visitor table (must be in same region as Lambda@Edge)

## Environment Variable Flow

1. **Manual Configuration**: Edit `.env`, `.env.dev`, and `.env.prod` files
2. **Parameter Upload**: Upload parameters to SSM using `upload-stack-params` command
3. **Stack Deployment**: Deploy infrastructure stacks using these parameters
4. **Stack Outputs**: Stack outputs are stored in SSM Parameter Store
5. **Service Environment Generation**: Generate service environment files using `ssm-params export` command
6. **Runtime Usage**: Applications read environment variables from generated files

## Management Tools

The environment variables are managed using the EnvironmentManager class, which provides methods for:

- **Loading**: `loadEnv(stage?)` - Load environment variables from .env files
- **Validation**: `validateEnv(env, required)` - Validate required environment variables
- **Generation**: `generateServiceEnvContent(service, params)` - Generate service environment files

For implementation details, see the [Core Managers Documentation](../architecture/infrastructure/core-managers.md).
