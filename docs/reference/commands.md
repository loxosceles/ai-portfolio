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
| `upload-static-data:dev`    | Upload static data to the development environment     |
| `upload-static-data:prod`   | Upload static data to the production environment      |
| `download-static-data:dev`  | Download static data from the development environment |
| `download-static-data:prod` | Download static data from the production environment  |

#### Parameter Management Scripts

| Script                     | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `export-stack-params:dev`  | Export stack parameters from the development environment |
| `export-stack-params:prod` | Export stack parameters from the production environment  |
| `upload-stack-params:dev`  | Upload stack parameters to the development environment   |
| `upload-stack-params:prod` | Upload stack parameters to the production environment    |

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

| Script                       | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `upload-stack-params:dev`    | Upload parameters to SSM in the development environment     |
| `upload-stack-params:prod`   | Upload parameters to SSM in the production environment      |
| `export-stack-params:dev`    | Export parameters from SSM in the development environment   |
| `export-stack-params:prod`   | Export parameters from SSM in the production environment    |
| `download-stack-params:dev`  | Download parameters from SSM in the development environment |
| `download-stack-params:prod` | Download parameters from SSM in the production environment  |

#### Data Management Scripts

| Script                      | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `upload-static-data:dev`    | Upload static data to S3 in the development environment           |
| `upload-static-data:prod`   | Upload static data to S3 in the production environment            |
| `download-static-data:dev`  | Download static data from S3 in the development environment       |
| `download-static-data:prod` | Download static data from S3 in the production environment        |
| `populate-static-data:dev`  | Populate DynamoDB with static data in the development environment |
| `populate-static-data:prod` | Populate DynamoDB with static data in the production environment  |

#### Web App Scripts

| Script                  | Description                         |
| ----------------------- | ----------------------------------- |
| `publish:web-app`       | Build and publish the web app to S3 |
| `invalidate:cloudfront` | Invalidate CloudFront cache         |

## CLI Commands

These commands are implemented in the `infrastructure/lib/cli/bin/` directory and provide direct access to infrastructure operations.

### SSM Parameters (`ssm-params.ts`)

**Commands**:

- `upload` - Upload parameters from infrastructure env files to SSM
- `export` - Export parameters from SSM

**Usage**:

```bash
# Upload parameters to SSM
ts-node lib/cli/bin/ssm-params.ts upload --verbose

# Export parameters from SSM
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
```

**Options**:

- `--target <target>` - Filter for specific target (infrastructure|frontend|link-generator)
- `--scope <scope>` - Parameter scope (stack for infrastructure)
- `--format <format>` - Output format (env|json)
- `--output` - Write to file
- `--output-path <path>` - Custom output file path
- `--regions <regions>` - Comma-separated regions
- `--verbose` - Verbose logging

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
```

**Options**:

- `--verbose` - Verbose logging
