# Infrastructure Architecture

The AI Portfolio infrastructure is built with AWS CDK and follows a clean architecture pattern with three main layers:

## Architecture Layers

- **Core Layer**: Reusable managers for AWS operations, environment handling, and configuration
- **CLI Layer**: Command-line interface for infrastructure management
- **Stack Layer**: CDK stack definitions for AWS resources

## Core Managers

The core layer consists of several managers that handle specific domains:

- **BaseManager**: Common functionality for all managers
- **EnvironmentManager**: Environment variable handling across different environments
- **AWSManager**: AWS operations (SSM, S3, CloudFormation, etc.)

[Detailed Core Managers Documentation](core-managers.md)

## CLI Architecture

The CLI layer provides command-line tools for infrastructure management:

- **Binary Layer**: Entry points in `lib/cli/bin/` that parse arguments and call commands
- **Command Layer**: Business logic in `lib/cli/commands/` that uses core managers

[Detailed CLI Architecture Documentation](cli-architecture.md)

## CDK Stacks

The stack layer defines the AWS resources using CDK:

- **Web Stack**: CloudFront, S3, and Lambda@Edge for frontend hosting
- **API Stack**: AppSync, Lambda, and DynamoDB for backend services
- **Shared Stack**: Cognito and other shared resources

[Detailed Stacks Documentation](stacks.md)

## Key Components

### Environment Management

The infrastructure uses a sophisticated environment management system:

- **Source of Truth**: Manual configuration files (.env and .env.[stage])
- **Parameter Store**: SSM Parameter Store for secure parameter storage
- **Service Environment Files**: Generated after stack deployment with dynamic outputs

### Deployment Pipeline

The deployment pipeline follows these steps:

1. Upload parameters to SSM Parameter Store
2. Deploy infrastructure stacks
3. Generate service environment files
4. Build and deploy frontend
5. Invalidate CloudFront cache

## Further Reading

- [Core Managers](core-managers.md)
- [CLI Architecture](cli-architecture.md)
- [Stacks](stacks.md)
- [Deployment Guide](../../deployment.md)
