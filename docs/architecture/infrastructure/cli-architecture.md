# CLI Architecture

The CLI architecture follows a three-tier approach that provides modularity, testability, and maintainability for infrastructure management operations.

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

## Key CLI Commands

### SSM Parameters (`ssm-params.ts`)

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

## CI/CD Integration

The CLI commands are integrated into the CI/CD pipeline:

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
