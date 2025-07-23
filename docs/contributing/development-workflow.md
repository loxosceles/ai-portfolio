# Development Workflow

This document describes the development workflow for the AI Portfolio application.

## Branching Strategy

We use a simplified Git flow branching strategy:

- `main`: Production-ready code
- `develop`: Development code
- Feature branches: Created from `develop` for new features
- Bugfix branches: Created from `develop` for bug fixes
- Hotfix branches: Created from `main` for urgent fixes

## Branch Naming

- Feature branches: `feature/feature-name`
- Bugfix branches: `bugfix/bug-name`
- Hotfix branches: `hotfix/issue-name`

## Development Process

1. **Create a Branch**: Create a new branch from `develop` for your feature or bug fix.

```bash
git checkout develop
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

7. **Create a Pull Request**: Create a pull request from your branch to `develop`.

8. **Code Review**: Wait for code review and address any feedback.

9. **Merge**: Once approved, merge your pull request into `develop`.

## Deployment Process

### Development Deployment

1. **Merge to Develop**: Merge your feature branch into `develop`.

2. **CI/CD Pipeline**: The CI/CD pipeline will automatically deploy to the development environment.

### Production Deployment

1. **Merge to Main**: Merge `develop` into `main`.

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

## Release Process

1. **Create a Release Branch**: Create a release branch from `develop`.

```bash
git checkout develop
git pull
git checkout -b release/v1.0.0
```

2. **Update Version**: Update the version number in `package.json`.

3. **Create a Pull Request**: Create a pull request from the release branch to `main`.

4. **Code Review**: Wait for code review and address any feedback.

5. **Merge**: Once approved, merge the pull request into `main`.

6. **Tag Release**: Create a tag for the release.

```bash
git checkout main
git pull
git tag v1.0.0
git push --tags
```

7. **Update Develop**: Merge `main` back into `develop`.

```bash
git checkout develop
git pull
git merge main
git push
```
