# CLI Architecture

The CLI architecture follows a three-tier approach that provides modularity, testability, and maintainability for infrastructure management operations.

> **Note**: For CLI usage examples and development setup, see the [Development Workflow](../../contributing/development-workflow.md#cli-development) documentation.

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
  - `stack-outputs.ts` - CloudFormation stack output retrieval
  - `sync-service-params.ts` - Service parameter synchronization from stack outputs

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
  - `stack-outputs.ts` - Orchestrates stack output retrieval
  - `sync-service-params.ts` - Orchestrates service parameter synchronization

### Tier 3: Domain Managers (`core/`)

- **Purpose**: Provide reusable, domain-specific functionality
- **Responsibilities**:
  - Encapsulate AWS service interactions and business rules
  - Implement domain-specific operations
  - Provide consistent interfaces across commands
- **Current Managers**:
  - `AWSManager` - AWS service operations
  - `EnvironmentManager` - Environment file management

## Key CLI Commands

### SSM Parameters (`ssm-params.ts`)

**Purpose**: Unified SSM parameter management with console-first approach

**Commands**:

- `upload` - Upload parameters from infrastructure env files to SSM
- `export` - Export parameters from SSM (replaces download)

**Upload Options**:

- `--target <target>` - Target for parameters (infrastructure|frontend|link-generator) [required]
- `--region <region>` - Upload to specific region only (eu-central-1|us-east-1)
- `--dry-run` - Show what would be uploaded without actually uploading
- `--skip-cleanup` - Skip cleanup of existing parameters before upload
- `--verbose` - Enable verbose logging

**Export Options**:

- `--target <target>` - Target for parameters (infrastructure|frontend|link-generator) [required]
- `--regions <regions>` - Comma-separated list of regions to download from
- `--scope <scope>` - Parameter scope (e.g., stack)
- `--format <format>` - Output format (env|json), defaults to env
- `--output` - Write to file instead of console output
- `--output-path <path>` - Custom output file path
- `--verbose` - Enable verbose logging

### Data Management (`data-management.ts`)

**Purpose**: Handle static data operations between S3 and DynamoDB

**Commands**:

- `upload` - Upload local JSON data to S3
- `download` - Download data from S3 to local files
- `populate_ddb_with_static_data` - Download from S3 and populate DynamoDB tables

**Options**:

- `--verbose` - Verbose logging
- `--region <region>` - Target region (uses SERVICE_REGIONS.data if not specified)
- `--output <path>` - Output directory for download

### Web App Publishing (`web-app-publish.ts`)

**Purpose**: Build and publish frontend to S3

**Options**:

- `--verbose` - Verbose logging

### CloudFront Invalidation (`invalidate-cloudfront-distribution.ts`)

**Purpose**: Invalidate CloudFront cache after deployment

**Options**:

- `--verbose` - Verbose logging

### Stack Outputs (`stack-outputs.ts`)

**Purpose**: Retrieve CloudFormation stack output values

**Usage**:

```bash
# Get CloudFront domain from web stack
stack-outputs web CloudfrontDomain

# Get API endpoint from API stack
stack-outputs api ApiEndpoint
```

**Arguments**:

- `<stackType>` - Stack type (web, api, shared) [required]
- `<outputKey>` - Output key to retrieve [required]

### Service Parameter Sync (`sync-service-params.ts`)

**Purpose**: Sync service parameters from CloudFormation stack outputs to SSM Parameter Store

**Usage**:

```bash
# Preview what would be synced and cleaned up (dry-run)
sync-service-params --dry-run --cleanup --verbose

# Sync only required service parameters (no deletion)
sync-service-params --verbose

# Sync service parameters and delete obsolete ones
sync-service-params --cleanup --verbose
```

**Options**:

- `--dry-run` - Show what would be synced without making changes
- `--cleanup` - Delete obsolete service parameters
- `--verbose` - Enable verbose logging

## Integration with Core Managers

The CLI commands integrate with the core managers to perform their operations:

### Environment Manager Integration

- **SSM Parameters Command**: Uses EnvironmentManager to load environment variables from .env files
- **Web App Publishing Command**: Uses EnvironmentManager to generate service environment files

### AWS Manager Integration

- **SSM Parameters Command**: Uses AWSManager to upload and download parameters from SSM
- **Data Management Command**: Uses AWSManager for S3 operations and DynamoDB operations
- **Web App Publishing Command**: Uses AWSManager to get bucket name and sync files to S3
- **CloudFront Invalidation Command**: Uses AWSManager to create invalidations

## Package Script Interface

The package scripts provide a higher-level interface to CLI commands:

### Infrastructure Package Scripts (`infrastructure/package.json`)

**CDK Operations**

- `provision:dev/prod` → CDK deploy with stage context
- `destroy:dev/prod` → CDK destroy (prod blocked)

**CLI-Based Operations**

- `upload-ssm-params:dev/prod` → `ssm-params upload --target=infrastructure --verbose`
- `export-ssm-params:dev/prod` → `ssm-params export --target=infrastructure --verbose`
- `upload-static-data:dev/prod` → `data-management upload`
- `download-static-data:dev/prod` → `data-management download`
- `populate-static-data-ddb:dev/prod` → `data-management populate_ddb_with_static_data --verbose`
- `publish-web-app:dev/prod` → `web-app-publish`
- `invalidate-cloudfront:dev/prod` → `invalidate-cloudfront-distribution`
- `stack-outputs:web:dev/prod` → `stack-outputs web <outputKey>`
- `sync-service-params:dev/prod` → `sync-service-params --verbose`
- `sync-service-params-dry-run:dev/prod` → `sync-service-params --dry-run --cleanup --verbose`
- `sync-service-params-cleanup:dev/prod` → `sync-service-params --cleanup --verbose`

### Root Package Scripts (`package.json`)

**Infrastructure Operations** (Delegate to infrastructure package)

- `deploy:dev/prod` → `scripts/deploy.sh` (Full deployment pipeline)
- `publish-frontend:dev` → `scripts/publish-frontend.sh` (Frontend-only deployment)
- `sync-static-data:dev/prod` → Combined upload and populate operations
- `upload-static-data:dev/prod` → `infrastructure:upload-static-data:dev/prod`
- `download-static-data:dev/prod` → `infrastructure:download-static-data:dev/prod`
- `upload-ssm-params:dev/prod` → `infrastructure:upload-ssm-params:dev/prod`
- `export-ssm-params:dev/prod` → `infrastructure:export-ssm-params:dev/prod`
- `sync-service-params:dev/prod` → `infrastructure:sync-service-params:dev/prod`
- `sync-service-params-dry-run:dev/prod` → `infrastructure:sync-service-params-dry-run:dev/prod`
- `sync-service-params-cleanup:dev/prod` → `infrastructure:sync-service-params-cleanup:dev/prod`

## CI/CD Integration

The CLI commands are integrated into the CI/CD pipeline via buildspec.yml. The buildspec uses direct `ts-node` calls to the CLI tools:

**Pre-Build Phase**:

1. Setup infrastructure environment: `ssm-params export --target=infrastructure --output`

**Build Phase**:

1. Provision infrastructure: `npx cdk deploy --all --require-approval never`
2. Populate data: `data-management populate_ddb_with_static_data --verbose`
3. Generate service environments: `ssm-params export --target=frontend --output`
4. Generate service environments: `ssm-params export --target=link-generator --output`
5. Build frontend: `NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT pnpm build`
6. Publish frontend: `web-app-publish`

**Post-Build Phase**:

1. Invalidate CloudFront: `invalidate-cloudfront-distribution`
2. Get deployment URL: `stack-outputs web CloudfrontDomain`

> **Implementation Note**: The buildspec.yml configures PATH to include the CLI bin directory, allowing direct command usage. For local development setup, see the [Development Workflow](../../contributing/development-workflow.md#cli-development) documentation.
