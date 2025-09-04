# Development Workflow

This document describes the development workflow for the AI Portfolio application.

## Branching Strategy

We use a simplified Git flow branching strategy:

- `main`: Production-ready code
- `dev`: Development code
- Feature branches: Created from `dev` for new features
- Bugfix branches: Created from `dev` for bug fixes
- Hotfix branches: Created from `main` for urgent fixes

## Branch Naming

- Feature branches: `feature/feature-name`
- Bugfix branches: `bugfix/bug-name`
- Hotfix branches: `hotfix/issue-name`

## Development Process

1. **Create a Branch**: Create a new branch from `dev` for your feature or bug fix.

```bash
git checkout dev
git pull
git checkout -b feature/your-feature-name
```

2. **Make Changes**: Make your changes to the codebase.

3. **Run Tests**: Make sure all tests pass.

```bash
pnpm run test
```

4. **Lint and Format**: Make sure your code follows the style guidelines.

```bash
pnpm run lint
pnpm run format
```

5. **Commit Changes**: Commit your changes with a descriptive message.

```bash
git add .
git commit -m "Add your feature or fix"
```

6. **Push Changes**: Push your changes to the remote repository.

```bash
git push -u origin feature/your-feature-name
```

7. **Create a Pull Request**: Create a pull request from your branch to `dev`.

8. **Code Review**: Wait for code review and address any feedback.

9. **Merge**: Once approved, merge your pull request into `dev`.

## Deployment Process

### Development Deployment

1. **Merge to Dev**: Merge your feature branch into `dev`.

2. **CI/CD Pipeline**: The CI/CD pipeline will automatically deploy to the development environment.

### Production Deployment

1. **Merge to Main**: Merge `dev` into `main`.

2. **CI/CD Pipeline**: The CI/CD pipeline will automatically deploy to the production environment.

## Local Development

For local development, follow these steps:

1. **Set Up Environment**: Set up your local environment as described in the [Local Development Guide](../guides/local-development.md).

2. **Start Development Server**: Start the Next.js development server.

```bash
pnpm run dev
```

3. **Make Changes**: Make your changes to the codebase.

4. **Test Changes**: Test your changes in the browser.

5. **Commit Changes**: Commit your changes as described above.

## Testing

We use Jest for testing:

- **Unit Tests**: Test individual functions and components.
- **Integration Tests**: Test interactions between components.
- **End-to-End Tests**: Test the entire application.

Run tests with:

```bash
# Run all tests
pnpm run test

# Run frontend tests
pnpm run test:frontend

# Run infrastructure tests
pnpm run test:infra
```

## Linting and Formatting

We use ESLint for linting and Prettier for formatting:

```bash
# Lint all code
pnpm run lint

# Lint frontend code
pnpm run lint:frontend

# Lint infrastructure code
pnpm run lint:infra

# Format all code
pnpm run format
```

## CLI Development

For developers working with the CLI system directly, this section provides setup and usage information.

> **Note**: For CLI architecture details, see the [CLI Architecture](../architecture/infrastructure/cli-architecture.md) documentation.

### CLI Setup for Development

The CLI tools are TypeScript files that require `ts-node` to execute. For development work:

```bash
# From infrastructure directory
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
ts-node lib/cli/bin/data-management.ts upload --verbose
ts-node lib/cli/bin/web-app-publish.ts
```

### Available CLI Commands

In this table we list the available CLI commands without the `ts-node` prefix, as they are typically run through `pnpm` scripts in the infrastructure package.

| Command                              | Purpose                    | Example Usage                                                                    |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| `ssm-params`                         | SSM parameter management   | `ts-node lib/cli/bin/ssm-params.ts upload --target=infrastructure --verbose`     |
| `data-management`                    | S3 and DynamoDB operations | `ts-node lib/cli/bin/data-management.ts populate_ddb_with_static_data --verbose` |
| `web-app-publish`                    | Frontend publishing        | `ts-node lib/cli/bin/web-app-publish.ts --verbose`                               |
| `invalidate-cloudfront-distribution` | Cache invalidation         | `ts-node lib/cli/bin/invalidate-cloudfront-distribution.ts`                      |
| `stack-outputs`                      | CloudFormation outputs     | `ts-node lib/cli/bin/stack-outputs.ts web CloudfrontDomain`                      |
| `sync-service-params`                | Service parameter sync     | `ts-node lib/cli/bin/sync-service-params.ts --dry-run --verbose`                 |

### CLI Development Guidelines

> **Note**: Many pnpm scripts use double dash parameter passing. See the [Commands Reference](../reference/commands.md#double-dash-parameter-passing) for details.

- **Use pnpm scripts for normal operations**: The package scripts provide the primary interface
- **Use direct CLI for development/debugging**: When working on CLI features or troubleshooting
- **Leverage double dash parameters**: Pass additional options to generic scripts
- **Follow the three-tier architecture**: Keep binaries, commands, and managers separate
- **Add proper error handling**: All CLI commands should handle errors gracefully
- **Include verbose options**: For debugging and development visibility

## Pre-Commit Hooks

We use Husky and lint-staged for pre-commit hooks:

- **Husky**: Runs scripts before commits.
- **lint-staged**: Runs linters on staged files.

The pre-commit hooks will:

1. Lint and format staged files.
2. Run tests related to staged files.

## Continuous Integration

We use GitHub Actions for continuous integration:

- **Pull Requests**: Run tests and linting on pull requests.
- **Develop Branch**: Deploy to the development environment.
- **Main Branch**: Deploy to the production environment.

## Versioning Requirements

All PRs targeting the `main` branch must include exactly one version label to indicate the type of release.

### Required Labels

- **`patch`** - Bug fixes, documentation updates, minor improvements (0.0.x)
- **`minor`** - New features, enhancements that don't break existing functionality (0.x.0)
- **`major`** - Breaking changes, major architectural changes (x.0.0)

### Adding Version Labels

1. **Create your PR** from `dev` to `main`
2. **Add exactly one version label** using GitHub's label interface
3. **Status check validates** the label automatically
4. **Merge is blocked** until a valid version label is present

### Label Validation

- ✅ **Valid**: PR has exactly one version label (`major`, `minor`, or `patch`)
- ❌ **Invalid**: No version label or multiple version labels
- 🔄 **Re-validation**: Status check runs automatically when labels change

### Examples

```
✅ PR with "patch" label → Version 0.2.6 → 0.2.7
✅ PR with "minor" label → Version 0.2.6 → 0.3.0
✅ PR with "major" label → Version 0.2.6 → 1.0.0
❌ PR with no version label → Merge blocked
❌ PR with "patch" and "minor" labels → Merge blocked
```

> **Technical Details**: See [Deployment Guide - Automatic Versioning](../guides/deployment.md#automatic-versioning) for implementation details.

## Release Process

Versions are automatically created when PRs are merged to `main`. The version number is determined by the label on the merged PR, and a corresponding git tag is created automatically.
