# CLI Architecture

## Problem Statement

Infrastructure management requires complex orchestration of multiple AWS services (SSM, S3, DynamoDB, CloudFront) across different stages and regions. Traditional approaches lead to:

- **Rigid Scripts**: Single-purpose scripts that can't be reused
- **Code Duplication**: Similar logic repeated across different commands
- **Poor Testability**: Monolithic functions mixing business logic with AWS calls
- **Maintenance Overhead**: Changes require updates in multiple places

## Solution: Three-Tier Architecture

This architecture provides:

- **Modularity**: Reusable components across different use cases
- **Testability**: Clear separation allows isolated unit testing
- **Composability**: Atomic operations can be combined for complex workflows
- **Maintainability**: Single responsibility principle at each tier

## Three-Tier Architecture

### Tier 1: CLI Binaries (`cli/bin/`)

- **Purpose**: Entry points that define command-line interfaces
- **Responsibilities**:
  - Handle argument parsing and option definitions
  - Delegate all business logic to commands
  - No domain logic implementation
- **Current Binaries**:
  - `data-management.ts` - Data operations (upload, download, populate DynamoDB)
  - `ssm-params.ts` - SSM parameter operations (upload, export)
  - `web-app-publish.ts` - Frontend build and publish
  - `invalidate-cloudfront-distribution.ts` - CloudFront cache invalidation

### Tier 2: Command Logic (`cli/commands/`)

- **Purpose**: Compose domain-specific functionality to implement command requirements
- **Responsibilities**:
  - Orchestrate multiple managers to achieve command goals
  - Handle command-specific validation and error handling
  - Bridge between CLI interface and core domain logic
  - Configure managers using external configuration (no embedded system knowledge)
- **Current Commands**:
  - `data-management.ts` - Orchestrates data operations
  - `ssm-params.ts` - Orchestrates SSM parameter operations
  - `web-app-publish.ts` - Orchestrates frontend publishing
  - `invalidate-cloudfront-distribution.ts` - Orchestrates CloudFront invalidation

### Tier 3: Domain Managers (`core/`)

- **Purpose**: Provide reusable, domain-specific functionality
- **Responsibilities**:
  - Encapsulate AWS service interactions and business rules
  - Implement domain-specific operations
  - Provide consistent interfaces across commands
- **Current Managers**:
  - `AWSManager` - AWS service operations
  - `EnvironmentManager` - Environment file management

## Infrastructure CLI Commands (`infrastructure/lib/cli/`)

**Note**: This section documents the CLI commands located in `infrastructure/lib/cli/`. These are distinct from package.json scripts which provide a higher-level interface.

### CLI Binaries (`cli/bin/`)

### 1. SSM Parameters (`ssm-params.ts`)

**Purpose**: Unified SSM parameter management with console-first approach

**Commands**:

- `upload` - Upload parameters from infrastructure env files to SSM
- `export` - Export parameters from SSM (replaces download)

**Export Options**:

- `--target <target>` - Filter for specific target (infrastructure|frontend|link-generator)
- `--scope <scope>` - Parameter scope (stack for infrastructure)
- `--format <format>` - Output format (env|json)
- `--output` - Write to file (requires --output-path for infrastructure locally)
- `--output-path <path>` - Custom output file path
- `--regions <regions>` - Comma-separated regions
- `--verbose` - Verbose logging

**Target Behavior**:

- `infrastructure` - Uses stack scope, requires --output-path locally
- `frontend` - Filters and prefixes with NEXT*PUBLIC*, can overwrite locally
- `link-generator` - Filters parameters, can overwrite locally
- No target - All parameters, uses infrastructure paths

**Safety Features**:

- Console output by default (non-destructive)
- Infrastructure files protected locally (require custom --output-path)
- Service files can be overwritten locally (auto-generated)
- CI environments can overwrite any files

### 2. Data Management (`data-management.ts`)

**Purpose**: Handle static data operations between S3 and DynamoDB

**Commands**:

- `upload` - Upload local JSON data to S3
- `download` - Download data from S3 to local files
- `populate_ddb_with_static_data` - Download from S3 and populate DynamoDB tables

**Options**:

- `--verbose` - Verbose logging
- `--region <region>` - Target region (uses SERVICE_REGIONS.data if not specified)
- `--output <path>` - Output directory for download

**Data Flow**:

1. Local JSON files → S3 bucket (upload)
2. S3 bucket → Local JSON files (download)
3. S3 bucket → DynamoDB tables (populate)

### 3. Web App Publishing (`web-app-publish.ts`)

**Purpose**: Build and publish frontend to S3

**Options**:

- `--verbose` - Verbose logging

**Process**:

1. Build Next.js application with environment variables
2. Get S3 bucket name from CloudFormation outputs
3. Sync built files to S3 bucket

### 4. CloudFront Invalidation (`invalidate-cloudfront-distribution.ts`)

**Purpose**: Invalidate CloudFront cache after deployment

**Options**:

- `--verbose` - Verbose logging

**Process**:

1. Get CloudFront distribution ID from SSM parameters
2. Create invalidation for all paths (/\*)
3. Display completion message with domain URL

## Configuration System

### Service Configuration (`configs/env-config.ts`)

**Infrastructure Paths**:

```typescript
INFRASTRUCTURE_ENV_PATHS = {
  base: 'infrastructure/.env',
  stage: (stage) => `infrastructure/.env.${stage}`,
  runtime: 'infrastructure/.env' // For CI
};
```

**Service Configurations**:

```typescript
SERVICE_CONFIGS = {
  frontend: {
    envPath: 'frontend/.env.local',
    requiredParams: ['APPSYNC_API_KEY', 'APPSYNC_URL', ...],
    prefix: 'NEXT_PUBLIC_',
    additionalParams: {}
  },
  'link-generator': {
    envPath: 'link-generator/.env',
    requiredParams: ['VISITOR_TABLE_NAME', ...],
    prefix: '',
    additionalParams: {
      AWS_REGION_DISTRIB: 'us-east-1',
      AWS_REGION_DEFAULT: 'eu-central-1'
    }
  }
}
```

### AWS Configuration (`configs/aws-config.ts`)

**Service Regions**:

```typescript
SERVICE_REGIONS = {
  cloudfront: 'us-east-1',
  web: 'us-east-1',
  api: 'eu-central-1',
  data: 'eu-central-1'
};
```

**Parameter Schema by Stage/Region**:

```typescript
PARAMETER_SCHEMA = {
  dev: {
    'eu-central-1': ['BEDROCK_MODEL_ID', 'CDK_DEFAULT_ACCOUNT', ...],
    'us-east-1': ['VISITOR_TABLE_NAME']
  },
  prod: {
    'eu-central-1': ['BEDROCK_MODEL_ID', 'CDK_DEFAULT_ACCOUNT', ...],
    'us-east-1': ['CERTIFICATE_ARN', 'PROD_DOMAIN_NAME', 'VISITOR_TABLE_NAME']
  }
}
```

## SSM Parameter Scoping System

### Infrastructure Parameters (Stack Scope)

- **Path**: `/portfolio/{stage}/stack/`
- **Usage**: Infrastructure deployment parameters (CDK outputs, resource names)
- **Target**: `--target=infrastructure` automatically uses stack scope
- **Examples**: CDK_DEFAULT_ACCOUNT, BEDROCK_MODEL_ID, DATA_BUCKET_NAME

### Service Parameters (Base Scope)

- **Path**: `/portfolio/{stage}/`
- **Usage**: Application service parameters (API keys, URLs, IDs)
- **Target**: Service targets (frontend, link-generator) use base scope
- **Examples**: APPSYNC_API_KEY, APPSYNC_URL, COGNITO_CLIENT_ID

## Package Script Interface

**Note**: Package scripts provide a higher-level interface to CLI commands and other operations. This is separate from the CLI architecture above.

### Infrastructure Package Scripts (`infrastructure/package.json`)

**CDK Operations**

- `provision:dev/prod` → CDK deploy with stage context
- `destroy:dev/prod` → CDK destroy (prod blocked)

**CLI-Based Operations**

- `upload-stack-params:dev/prod` → `ssm-params.ts upload`
- `upload-static-data:dev/prod` → `data-management.ts upload`
- `download-static-data:dev/prod` → `data-management.ts download`
- `populate-static-data:dev/prod` → `data-management.ts populate_ddb_with_static_data`
- `publish:web-app` → `web-app-publish.ts`
- `invalidate:cloudfront` → `invalidate-cloudfront-distribution.ts`

### Root Package Scripts (`package.json`)

**Infrastructure Operations** (Delegate to infrastructure package)

- `upload-static-data:dev/prod` → `infrastructure:upload-static-data:dev/prod`
- `download-static-data:dev/prod` → `infrastructure:download-static-data:dev/prod`
- `upload-stack-params:dev/prod` → `infrastructure:upload-stack-params:dev/prod`

## CI/CD Integration (buildspec.yml)

**Pre-Build Phase**:

1. Setup infrastructure environment: `ssm-params export --target=infrastructure --output`
2. Provision infrastructure: `pnpm run provision:$ENVIRONMENT`

**Build Phase**:

1. Populate data: `pnpm run populate-static-data:$ENVIRONMENT`
2. Generate service environments: `ssm-params export --target=frontend --output`
3. Generate service environments: `ssm-params export --target=link-generator --output`
4. Build and publish frontend: `pnpm run publish:web-app`

**Post-Build Phase**:

1. Invalidate CloudFront: `pnpm run invalidate:cloudfront`

## Legacy Cleanup Required

**Files/Scripts to Remove**:

- `infrastructure/lib/cli/bin/__bak__service-env.ts`
- `infrastructure/lib/cli/commands/__bak__service-env.ts`
- `infrastructure/types/cli/service-env.ts`
- `infrastructure/test/integration/__bak__service-env.test_obsolete.ts`

**Package Scripts to Remove**:

- `download-stack-params:dev/prod` (infrastructure) - Use `ssm-params export --target=infrastructure`
- `download-ssm-params:dev/prod` (infrastructure) - Use `ssm-params export`
- `generate-service-env:*` (root) - Use `ssm-params export --target=<service>`

**Buildspec Direct CLI Calls to Script**:

- `ts-node ./lib/cli/bin/ssm-params.ts export --target=frontend --output` → Add package script
- `ts-node ./lib/cli/bin/ssm-params.ts export --target=link-generator --output` → Add package script
