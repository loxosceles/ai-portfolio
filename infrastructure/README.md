# AI Portfolio Infrastructure

This directory contains the infrastructure code for the AI Portfolio application, built with AWS CDK and TypeScript.

For detailed documentation, see [Infrastructure Architecture](../docs/architecture/infrastructure/overview.md).

## Project Structure

- `lib/core/`: Core managers for AWS operations, environment handling, and configuration
- `lib/cli/`: Command-line interface tools for managing the application
- `lib/stacks/`: CDK stack definitions
- `lib/functions/`: Lambda function code
- `lib/resolvers/`: AppSync resolver constructs
- `test/`: Comprehensive test suite with CLI, command, and manager tests

## Core Managers

### AWS Manager

- `lib/core/aws-manager.ts`: Unified manager for all AWS service operations (SSM, S3, DynamoDB, CloudFormation, CloudFront)

### Environment Manager

- `lib/core/env-manager.ts`: Environment file loading, validation, and service configuration

### Base Manager

- `lib/core/base-manager.ts`: Base class with common functionality for all managers

## CLI Tools

### Command Layer

- `lib/cli/commands/`: Command handlers for business logic
  - `data-management.ts`: Static data upload/download operations
  - `ssm-params.ts`: SSM parameter management
  - `web-app-publish.ts`: Frontend deployment to S3
  - `invalidate-cloudfront-distribution.ts`: CloudFront cache invalidation

### Binary Layer

- `lib/cli/bin/`: CLI entry points that call command handlers

## Testing Strategy

The infrastructure includes a comprehensive 3-layer testing strategy:

1. **CLI Binary Tests**: Test CLI interfaces with mocked command handlers
2. **Command Tests**: Test command handlers with mocked AWS managers
3. **Manager Tests**: Test AWS managers with mocked AWS SDK clients

All tests use proper AWS SDK mocking to prevent real AWS calls and ensure fast execution.

## Useful Commands

### Testing

- `pnpm test`: Run all tests
- `pnpm test:watch`: Run tests in watch mode

### Environment Management

- `pnpm upload-stack-params:dev`: Upload parameters for dev stage
- `pnpm upload-stack-params:prod`: Upload parameters for prod stage

### Data Management

- `pnpm upload-static-data:dev`: Upload static data for dev stage
- `pnpm upload-static-data:prod`: Upload static data for prod stage

### Deployment

- `pnpm deploy:dev`: Deploy all stacks for dev stage
- `pnpm deploy:prod`: Deploy all stacks for prod stage

### CDK Commands

- `pnpm build`: Compile TypeScript to JavaScript
- `pnpm synth`: Emit the synthesized CloudFormation template
- `pnpm diff`: Compare deployed stack with current state

## Architecture

The infrastructure follows a clean architecture pattern:

- **CLI Layer**: User interface and argument parsing
- **Command Layer**: Business logic and orchestration
- **Manager Layer**: AWS service abstractions and operations

This separation enables comprehensive testing and maintainable code.

## Module System Approach

The project uses a hybrid module system approach:

- **Infrastructure Code**: Written in TypeScript and compiled to CommonJS modules for compatibility with AWS CDK
- **Lambda Functions**: Written as pure JavaScript ES modules (.mjs files) to avoid transpilation and minimize cold-start times

This separation minimizes the interaction between the two systems, with only a few specific integration points:

- **Model Validation**: TypeScript infrastructure code validates model IDs against a list in `supported-models.ts`
- **Testing**: Dynamic imports are used in tests to validate consistency between systems

This approach provides robust tooling for infrastructure while keeping Lambda functions lightweight and efficient.
