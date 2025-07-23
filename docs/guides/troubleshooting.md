# Troubleshooting Guide

This guide provides solutions for common issues you might encounter when working with the AI Portfolio application.

## Deployment Issues

### Missing Parameters

**Issue**: Deployment fails with errors about missing parameters.

**Solution**:

1. Make sure you've uploaded the parameters to SSM:

```bash
pnpm run upload-stack-params:dev
```

2. Check if the parameters exist in SSM:

```bash
aws ssm get-parameters-by-path --path "/portfolio/dev/stack/" --region eu-central-1
aws ssm get-parameters-by-path --path "/portfolio/dev/" --region us-east-1
```

3. If parameters are missing, check your `.env` and `.env.dev` files and upload them again.

### Stack Deployment Failures

**Issue**: CDK stack deployment fails.

**Solution**:

1. Check the CloudFormation events for the failed stack:

```bash
aws cloudformation describe-stack-events --stack-name portfolio-web-dev --region us-east-1
```

2. Look for the specific error message in the events.

3. Fix the issue in your CDK code or configuration and try again.

### Service Environment File Generation Failures

**Issue**: Service environment file generation fails.

**Solution**:

1. Make sure the infrastructure stacks have been deployed successfully.

2. Check if the required parameters exist in SSM:

```bash
aws ssm get-parameters-by-path --path "/portfolio/dev/" --region eu-central-1
```

3. Try generating the service environment files manually:

```bash
cd infrastructure
ts-node lib/cli/bin/ssm-params.ts export --target=frontend --output --verbose
ts-node lib/cli/bin/ssm-params.ts export --target=link-generator --output --verbose
cd ..
```

## Frontend Issues

### Authentication Issues

**Issue**: Authentication doesn't work in local development.

**Solution**:

1. Use the local request interceptor by adding a `visitor` query parameter to the URL:

```
http://localhost:3000?visitor=test
```

2. Check if the environment variables are set correctly in `frontend/.env.local`.

3. Make sure the Cognito user pool and client are configured correctly.

### API Request Failures

**Issue**: API requests fail with authentication errors.

**Solution**:

1. Check if the authentication tokens are available in the cookies.

2. Make sure the AppSync API key is set correctly in the environment variables.

3. Check if the AppSync API URL is correct.

4. Try using the local request interceptor for development.

### Build Failures

**Issue**: Next.js build fails.

**Solution**:

1. Check if all required environment variables are set in `frontend/.env.local`.

2. Make sure all dependencies are installed:

```bash
cd frontend
pnpm install
cd ..
```

3. Check for TypeScript errors:

```bash
cd frontend
pnpm run lint
cd ..
```

## Infrastructure Issues

### CDK Synthesis Failures

**Issue**: CDK synthesis fails.

**Solution**:

1. Check for TypeScript errors:

```bash
cd infrastructure
pnpm run build
cd ..
```

2. Make sure all required environment variables are set.

3. Check if the AWS credentials are configured correctly.

### Parameter Upload Failures

**Issue**: Parameter upload to SSM fails.

**Solution**:

1. Check if the AWS credentials have the necessary permissions.

2. Make sure the environment variables are set correctly in `.env` and `.env.dev`.

3. Try uploading with verbose logging:

```bash
pnpm run upload-stack-params:dev -- --verbose
```

### Data Upload Failures

**Issue**: Data upload to S3 fails.

**Solution**:

1. Check if the S3 bucket exists:

```bash
aws s3 ls s3://your-bucket-name
```

2. Make sure the AWS credentials have the necessary permissions.

3. Try uploading with verbose logging:

```bash
pnpm run upload-static-data:dev -- --verbose
```

## CI/CD Issues

### CodeBuild Failures

**Issue**: CodeBuild pipeline fails.

**Solution**:

1. Check the CodeBuild logs for the specific error message.

2. Make sure the buildspec.yml file is correct.

3. Check if the AWS credentials have the necessary permissions.

4. Make sure the SSM parameters are set correctly.

### CloudFront Invalidation Failures

**Issue**: CloudFront invalidation fails.

**Solution**:

1. Check if the CloudFront distribution ID is correct in the SSM parameters.

2. Make sure the AWS credentials have the necessary permissions.

3. Try invalidating manually:

```bash
aws cloudfront create-invalidation --distribution-id your-distribution-id --paths "/*"
```

## Common Error Messages

### "Missing required environment variables"

**Cause**: Pre-deployment parameters not uploaded to SSM.

**Solution**: Run `pnpm upload-stack-params:dev`.

### "Parameter not found: /portfolio/dev/CLOUDFRONT_DISTRIBUTION_ID"

**Cause**: Infrastructure deployment failed, post-deployment parameters not created.

**Solution**: Re-deploy infrastructure to generate parameters.

### "No access token available in deployed environment"

**Cause**: Frontend built with wrong NEXT_PUBLIC_ENVIRONMENT value.

**Solution**: Ensure deploy scripts set correct environment variable.
