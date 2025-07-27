# Commands Reference

This document provides a reference for all package scripts used in the AI Portfolio application. These scripts provide the primary interface for managing the application.

> **Note**: For direct CLI development and lower-level command usage, see the [Development Workflow](../contributing/development-workflow.md#cli-development) documentation.

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
