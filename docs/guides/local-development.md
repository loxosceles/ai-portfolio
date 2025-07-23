# Local Development Guide

This guide explains how to set up and run the AI Portfolio application in a local development environment.

## Prerequisites

- Node.js 18 or later
- pnpm 8 or later
- AWS CLI configured with appropriate credentials
- AWS CDK installed globally (optional)

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ai-portfolio.git
cd ai-portfolio
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# Copy the example environment files
cp infrastructure/.env.example infrastructure/.env
cp infrastructure/.env.dev.example infrastructure/.env.dev
```

4. Edit the environment files with your AWS account details and other configuration.

## Local Development Workflow

### 1. Upload Parameters to SSM

Before you can deploy the infrastructure, you need to upload the parameters to SSM:

```bash
pnpm run upload-stack-params:dev
```

### 2. Upload Static Data to S3

Upload the static data to S3:

```bash
pnpm run upload-static-data:dev
```

### 3. Deploy Infrastructure

Deploy the infrastructure stacks:

```bash
cd infrastructure
pnpm run provision:dev
cd ..
```

### 4. Generate Service Environment Files

Generate the environment files for the frontend and link generator:

```bash
cd infrastructure
pnpm run export-stack-params:dev
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output
cd ..
```

### 5. Start the Development Server

Start the Next.js development server:

```bash
pnpm run dev
```

The application will be available at http://localhost:3000.

## Local Development Features

### Local Request Interceptor

The application includes a local request interceptor that allows you to develop without real authentication:

1. Add a `visitor` query parameter to the URL: http://localhost:3000?visitor=test
2. The interceptor will provide mock data for advocate greetings and AI advocate

### Environment Detection

The application detects the local environment and adjusts its behavior accordingly:

- In local development, it uses the API key for all requests
- In deployed environments, it uses Cognito tokens for authenticated requests

## Testing

Run the tests:

```bash
# Run all tests
pnpm run test

# Run frontend tests
pnpm run test:frontend

# Run infrastructure tests
pnpm run test:infra
```

## Linting and Formatting

Lint the code:

```bash
# Lint all code
pnpm run lint

# Lint frontend code
pnpm run lint:frontend

# Lint infrastructure code
pnpm run lint:infra
```

Format the code:

```bash
pnpm run format
```

## Troubleshooting

### Missing Parameters

If you see errors about missing parameters, make sure you've uploaded the parameters to SSM:

```bash
pnpm run upload-stack-params:dev
```

### Authentication Issues

If you're having authentication issues in local development, try using the local request interceptor by adding a `visitor` query parameter to the URL:

```
http://localhost:3000?visitor=test
```

### Environment Variable Issues

If you're having issues with environment variables, check the generated environment files:

```bash
cat frontend/.env.local
cat link-generator/.env
```

If they're missing or incorrect, regenerate them:

```bash
cd infrastructure
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output
ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output
cd ..
```
