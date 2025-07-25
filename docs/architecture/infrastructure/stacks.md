# CDK Stacks

The AI Portfolio infrastructure is defined using AWS CDK stacks. This document provides an overview of the stacks and their resources.

## Stack Structure

The infrastructure is organized into three main stacks:

- **Web Stack**: CloudFront, S3, and Lambda@Edge for frontend hosting
- **API Stack**: AppSync, Lambda, and DynamoDB for backend services
- **Shared Stack**: Cognito and other shared resources

## Web Stack

The Web Stack (`portfolio-web-{stage}`) contains resources for hosting the frontend:

### Resources

- **S3 Bucket**: Hosts the static Next.js frontend
- **CloudFront Distribution**: Distributes the frontend globally
- **Lambda@Edge**: Handles authentication and token validation
- **CloudFront Origin Access Identity**: Secures access to the S3 bucket

### Outputs

- **WebBucketName**: Name of the S3 bucket hosting the frontend
- **CloudfrontDomainName**: Domain name of the CloudFront distribution
- **CloudfrontDistributionId**: ID of the CloudFront distribution

## API Stack

The API Stack (`portfolio-api-{stage}`) contains resources for the backend services:

### Resources

- **AppSync API**: GraphQL API for data access
- **Lambda Functions**: Resolvers for AppSync API
- **DynamoDB Tables**: Data storage for the application
  - **Developer Table**: Stores developer profile data
  - **Projects Table**: Stores project data
  - **Recruiter Profiles Table**: Stores recruiter profile data

### Outputs

- **AppsyncApiKey**: API key for the AppSync API
- **AppSyncUrl**: URL of the AppSync API
- **DeveloperTableName**: Name of the DynamoDB table for developer profiles
- **ProjectsTableName**: Name of the DynamoDB table for projects
- **RecruiterProfilesTableName**: Name of the DynamoDB table for recruiter profiles

## Shared Stack

The Shared Stack (`portfolio-shared-{stage}`) contains shared resources:

### Resources

- **Cognito User Pool**: User authentication
- **Cognito User Pool Client**: Client for the user pool
- **Cognito Domain**: Domain for the user pool
- **S3 Bucket**: Stores static data for the application
- **DynamoDB Table**: Stores visitor data

### Outputs

- **CognitoUserPoolId**: ID of the Cognito user pool
- **CognitoClientId**: ID of the Cognito user pool client
- **CognitoDomainName**: Domain name of the Cognito user pool
- **CognitoAuthority**: Authority URL for the Cognito user pool
- **DataBucketName**: Name of the S3 bucket for static data
- **VisitorTableName**: Name of the DynamoDB table for visitors

## Stack Dependencies

The stacks have the following dependencies:

- **Web Stack**: Depends on Shared Stack for Cognito resources
- **API Stack**: Depends on Shared Stack for Cognito resources

## Stack Configuration

The stacks are configured using environment variables and SSM parameters:

- **Environment Variables**: Loaded from .env files
- **SSM Parameters**: Stored in SSM Parameter Store

For more details on the environment variables, see the [Environment Variables Reference](../../reference/environment-variables.md) document.

## Stack Deployment

The stacks are deployed using the CDK CLI:

```bash
# Deploy all stacks
pnpm run provision:dev

# Deploy a specific stack
cdk deploy portfolio-web-dev
```

For more details on the deployment process, see the [Deployment Guide](../../deployment.md) document.
