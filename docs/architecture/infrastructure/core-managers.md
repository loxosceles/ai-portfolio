# Core Managers

The core managers provide reusable functionality for AWS operations, environment handling, and configuration. These managers follow a clean architecture pattern and are designed to be used by both CLI commands and stack creation.

## Architecture Pattern

The core managers implement a layered architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    CLI Commands                     │
│                                                     │
└───────────────────────────┬─────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                   Core Managers                     │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │             │    │             │    │         │  │
│  │ Environment │    │     AWS     │    │  Base   │  │
│  │   Manager   │    │   Manager   │    │ Manager │  │
│  │             │    │             │    │         │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                                                     │
└───────────────────────────┬─────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    AWS Services                     │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │             │    │             │    │         │  │
│  │     SSM     │    │     S3      │    │   CDK   │  │
│  │             │    │             │    │         │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Manager Responsibilities

### BaseManager

The BaseManager provides common functionality for all managers:

- **Configuration Management**: Loading and validating configuration
- **Logging**: Consistent logging with verbosity control
- **Error Handling**: Standardized error handling patterns

### EnvironmentManager

The EnvironmentManager handles environment variables across different environments:

- **Environment Loading**: Loading variables from .env files
- **Environment Validation**: Validating required variables
- **Service Environment Generation**: Creating service-specific environment files

### AWSManager

The AWSManager abstracts AWS operations:

- **Parameter Management**: SSM parameter operations
- **Stack Outputs**: CloudFormation stack output retrieval
- **S3 Operations**: File upload and download
- **CloudFront Operations**: Cache invalidation

## Key Design Patterns

### Dependency Injection

Managers are designed to be instantiated with dependencies:

```typescript
// Create managers with dependencies
const baseManager = new BaseManager({ verbose: true });
const envManager = new EnvironmentManager({ baseManager });
const awsManager = new AWSManager({ baseManager });

// Use managers in commands
const command = new DeployCommand({ envManager, awsManager });
```

### Command Pattern

CLI commands use managers to implement operations:

```typescript
class DeployCommand {
  constructor(private deps: { envManager: EnvironmentManager; awsManager: AWSManager }) {}

  async execute(stage: string): Promise<void> {
    // Load environment variables
    const env = this.deps.envManager.loadEnv(stage);

    // Validate required variables
    this.deps.envManager.validateEnv(env, ['REQUIRED_VAR']);

    // Execute AWS operations
    await this.deps.awsManager.deployStack(stage);
  }
}
```

### Strategy Pattern

Managers implement different strategies based on environment:

```typescript
// Different strategies for different environments
if (isCI) {
  // CI environment strategy
  return this.loadEnvFromSSM(stage);
} else {
  // Local environment strategy
  return this.loadEnvFromFiles(stage);
}
```

## Integration with CLI

The core managers are used by CLI commands to implement infrastructure operations:

1. **CLI Binary**: Parses arguments and creates command
2. **Command**: Uses managers to implement business logic
3. **Managers**: Execute operations against AWS services

For more details on CLI architecture, see [CLI Architecture](cli-architecture.md).

## Related Documentation

- [Environment Variables Reference](../../reference/environment-variables.md)
- [Configuration Reference](../../reference/configuration.md)
- [Commands Reference](../../reference/commands.md)
