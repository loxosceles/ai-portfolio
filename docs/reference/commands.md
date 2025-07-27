# Commands Reference

This document provides a reference for all CLI commands and package scripts used in the AI Portfolio application.

## Package Scripts

### Root Package Scripts

These scripts are defined in the root `package.json` file and provide a high-level interface to the application's functionality.

#### Deployment Scripts

| Script        | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `deploy:dev`  | Deploy the application to the development environment                     |
| `deploy:prod` | Deploy the application to the production environment (currently disabled) |

#### Data Management Scripts

| Script                      | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `sync-static-data:dev`      | Upload and populate static data (development)         |
| `sync-static-data:prod`     | Upload and populate static data (production)          |
| `upload-static-data:dev`    | Upload static data to the development environment     |
| `upload-static-data:prod`   | Upload static data to the production environment      |
| `download-static-data:dev`  | Download static data from the development environment |
| `download-static-data:prod` | Download static data from the production environment  |

#### Parameter Management Scripts

| Script                             | Description                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| `export-ssm-params:dev`            | Export SSM parameters from the development environment         |
| `export-ssm-params:prod`           | Export SSM parameters from the production environment          |
| `upload-ssm-params:dev`            | Upload SSM parameters to the development environment           |
| `upload-ssm-params:prod`           | Upload SSM parameters to the production environment            |
| `sync-service-params-dry-run:dev`  | Preview service parameter sync with cleanup (development)      |
| `sync-service-params-dry-run:prod` | Preview service parameter sync with cleanup (production)       |
| `sync-service-params:dev`          | Sync required service parameters only (development)            |
| `sync-service-params:prod`         | Sync required service parameters only (production)             |
| `sync-service-params-cleanup:dev`  | Sync service parameters and delete obsolete ones (development) |
| `sync-service-params-cleanup:prod` | Sync service parameters and delete obsolete ones (production)  |

#### Development Scripts

| Script  | Description                  |
| ------- | ---------------------------- |
| `dev`   | Start the development server |
| `build` | Build the application        |

#### Testing Scripts

| Script          | Description              |
| --------------- | ------------------------ |
| `test`          | Run all tests            |
| `test:frontend` | Run frontend tests       |
| `test:infra`    | Run infrastructure tests |

#### Linting Scripts

| Script          | Description              |
| --------------- | ------------------------ |
| `lint`          | Lint all code            |
| `lint:frontend` | Lint frontend code       |
| `lint:infra`    | Lint infrastructure code |
| `format`        | Format all code          |
| `format:check`  | Check code formatting    |

### Infrastructure Package Scripts

These scripts are defined in the `infrastructure/package.json` file and provide more detailed control over infrastructure operations.

#### CDK Scripts

| Script  | Description                                               |
| ------- | --------------------------------------------------------- |
| `build` | Build the CDK application                                 |
| `watch` | Watch for changes and rebuild                             |
| `diff`  | Show differences between deployed stack and current state |
| `synth` | Synthesize CloudFormation template                        |

#### Deployment Scripts

| Script           | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `provision:dev`  | Deploy all stacks to the development environment                      |
| `provision:prod` | Deploy all stacks to the production environment                       |
| `destroy:dev`    | Destroy all stacks in the development environment                     |
| `destroy:prod`   | Destroy all stacks in the production environment (currently disabled) |

#### Parameter Management Scripts

| Script                             | Description                                                    |
| ---------------------------------- | -------------------------------------------------------------- |
| `upload-ssm-params:dev`            | Upload parameters to SSM in the development environment        |
| `upload-ssm-params:prod`           | Upload parameters to SSM in the production environment         |
| `export-ssm-params:dev`            | Export parameters from SSM in the development environment      |
| `export-ssm-params:prod`           | Export parameters from SSM in the production environment       |
| `sync-service-params-dry-run:dev`  | Preview service parameter sync with cleanup (development)      |
| `sync-service-params-dry-run:prod` | Preview service parameter sync with cleanup (production)       |
| `sync-service-params:dev`          | Sync required service parameters only (development)            |
| `sync-service-params:prod`         | Sync required service parameters only (production)             |
| `sync-service-params-cleanup:dev`  | Sync service parameters and delete obsolete ones (development) |
| `sync-service-params-cleanup:prod` | Sync service parameters and delete obsolete ones (production)  |

#### Data Management Scripts

| Script                          | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `upload-static-data:dev`        | Upload static data to S3 in the development environment           |
| `upload-static-data:prod`       | Upload static data to S3 in the production environment            |
| `download-static-data:dev`      | Download static data from S3 in the development environment       |
| `download-static-data:prod`     | Download static data from S3 in the production environment        |
| `populate-static-data-ddb:dev`  | Populate DynamoDB with static data in the development environment |
| `populate-static-data-ddb:prod` | Populate DynamoDB with static data in the production environment  |

#### Web App Scripts

| Script                       | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `publish-web-app:dev`        | Build and publish the web app to S3 (development) |
| `publish-web-app:prod`       | Build and publish the web app to S3 (production)  |
| `invalidate-cloudfront:dev`  | Invalidate CloudFront cache (development)         |
| `invalidate-cloudfront:prod` | Invalidate CloudFront cache (production)          |
| `stack-outputs:web:dev`      | Get web stack outputs (development)               |
| `stack-outputs:web:prod`     | Get web stack outputs (production)                |

## CLI Commands

These commands are implemented in the `infrastructure/lib/cli/bin/` directory and provide direct access to infrastructure operations.

### SSM Parameters (`ssm-params.ts`)

**Commands**:

- `upload` - Upload parameters from infrastructure env files to SSM
- `export` - Export parameters from SSM

**Usage**:

```bash
# Upload parameters to SSM
ts-node lib/cli/bin/ssm-params.ts upload --target=infrastructure --verbose

# Upload parameters without cleanup
ts-node lib/cli/bin/ssm-params.ts upload --target=infrastructure --skip-cleanup --verbose

# Dry run (show what would be uploaded)
ts-node lib/cli/bin/ssm-params.ts upload --target=infrastructure --dry-run --verbose

# Export parameters from SSM
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
```

**Upload Options**:

- `--target <target>` - Target for parameters (infrastructure|frontend|link-generator) [required]
- `--region <region>` - Upload to specific region only (eu-central-1|us-east-1)
- `--dry-run` - Show what would be uploaded without actually uploading
- `--verbose` - Enable verbose logging

> **Note**: The upload command now shows you exactly which parameters will be deleted before asking for confirmation. This interactive prompt ensures you can make an informed decision about the cleanup process.

**Export Options**:

- `--target <target>` - Target for parameters (infrastructure|frontend|link-generator) [required]
- `--regions <regions>` - Comma-separated list of regions to download from
- `--scope <scope>` - Parameter scope (e.g., stack)
- `--format <format>` - Output format (env|json), defaults to env
- `--output` - Write to file instead of console output
- `--output-path <path>` - Custom output file path
- `--verbose` - Enable verbose logging

### Data Management (`data-management.ts`)

**Commands**:

- `upload` - Upload local JSON data to S3
- `download` - Download data from S3 to local files
- `populate_ddb_with_static_data` - Download from S3 and populate DynamoDB tables

**Usage**:

```bash
# Upload data to S3
ts-node lib/cli/bin/data-management.ts upload --verbose

# Download data from S3
ts-node lib/cli/bin/data-management.ts download --output ./data

# Populate DynamoDB with data from S3
ts-node lib/cli/bin/data-management.ts populate_ddb_with_static_data --verbose
```

**Options**:

- `--verbose` - Verbose logging
- `--region <region>` - Target region
- `--output <path>` - Output directory for download

### Web App Publishing (`web-app-publish.ts`)

**Usage**:

```bash
# Publish web app to S3
ts-node lib/cli/bin/web-app-publish.ts --verbose
```

**Options**:

- `--verbose` - Verbose logging

### CloudFront Invalidation (`invalidate-cloudfront-distribution.ts`)

**Usage**:

```bash
# Invalidate CloudFront cache
ts-node lib/cli/bin/invalidate-cloudfront-distribution.ts --verbose

# Or using CLI directly (with PATH configured)
invalidate-cloudfront-distribution --verbose
```

**Options**:

- `--verbose` - Verbose logging

### Stack Outputs (`stack-outputs.ts`)

**Usage**:

```bash
# Get CloudFront domain from web stack
ts-node lib/cli/bin/stack-outputs.ts web CloudfrontDomain

# Get API endpoint from API stack
ts-node lib/cli/bin/stack-outputs.ts api ApiEndpoint

# Or using CLI directly (with PATH configured)
stack-outputs web CloudfrontDomain
stack-outputs api ApiEndpoint
```

**Arguments**:

- `<stackType>` - Stack type (web, api, shared) [required]
- `<outputKey>` - Output key to retrieve [required]

### Service Parameter Sync (`sync-service-params.ts`)

**Usage**:

```bash
# Preview what would be synced and cleaned up (dry-run)
ts-node lib/cli/bin/sync-service-params.ts --dry-run --cleanup --verbose

# Sync only required service parameters (no deletion)
ts-node lib/cli/bin/sync-service-params.ts --verbose

# Sync service parameters and delete obsolete ones
ts-node lib/cli/bin/sync-service-params.ts --cleanup --verbose
```

**Options**:

- `--dry-run` - Show what would be synced without making changes
- `--cleanup` - Delete obsolete service parameters
- `--verbose` - Enable verbose logging

> **Purpose**: This command reads stack outputs from deployed CloudFormation stacks and syncs only the required service parameters to SSM Parameter Store. It filters out unnecessary parameters and can optionally clean up obsolete ones. The command uses service configuration to determine which parameters are actually needed by each service.

**Usage**:

```bash
# Preview what would be synced and cleaned up (dry-run)
ts-node lib/cli/bin/sync-service-params.ts --dry-run --cleanup --verbose

# Sync only required service parameters (no deletion)
ts-node lib/cli/bin/sync-service-params.ts --verbose

# Sync service parameters and delete obsolete ones
ts-node lib/cli/bin/sync-service-params.ts --cleanup --verbose

# Or using CLI directly (with PATH configured)
sync-service-params --dry-run --cleanup --verbose
sync-service-params --verbose
sync-service-params --cleanup --verbose
```

**Options**:

- `--dry-run` - Show what would be synced without making changes
- `--cleanup` - Delete obsolete service parameters
- `--verbose` - Enable verbose logging
