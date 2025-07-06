#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { SharedStack } from '../lib/stacks/shared-stack';
import { JobMatchingStack } from '../lib/stacks/job-matching-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';

// Load environment variables from environment-specific .env file
const environment = process.env.ENVIRONMENT || 'dev';
dotenv.config({
  path: path.join(__dirname, '..', `.env.${environment}`)
});

// Load common variables from default .env file
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

const app = new cdk.App();

// Validate required environment variables
if (!process.env.CDK_DEFAULT_ACCOUNT || !process.env.CDK_DEFAULT_REGION) {
  throw new Error('CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION must be set');
}

if (!process.env.BEDROCK_MODEL_ID) {
  // Check if we're running in CodeBuild (CI/CD pipeline)
  if (process.env.CODEBUILD_BUILD_ID) {
    throw new Error(
      'BEDROCK_MODEL_ID environment variable is required. Make sure the parameter exists in SSM at /portfolio/{env}/BEDROCK_MODEL_ID'
    );
  } else {
    throw new Error(
      'BEDROCK_MODEL_ID environment variable is required. Please set it in the .env file.'
    );
  }
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// Get stage from context or environment
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

if (!['dev', 'prod'].includes(stage)) {
  throw new Error('Stage must be either "dev" or "prod"');
}

// Create shared infrastructure
const sharedStack = new SharedStack(app, `PortfolioSharedStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env
});

// Create combined website stack in us-east-1 first to get the CloudFront domain
const webStack = new WebStack(app, `PortfolioWebStack-${stage}`, {
  stage,
  userPool: sharedStack.userPool,
  userPoolClient: sharedStack.userPoolClient,
  env: {
    account: env.account,
    region: 'us-east-1' // Lambda@Edge must be in us-east-1
  },
  crossRegionReferences: true
});

// Create Job Matching stack with CloudFront domain
const jobMatchingStack = new JobMatchingStack(app, `JobMatchingStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool,
  cloudfrontDomain: `https://${webStack.distribution.distributionDomainName}`,
  crossRegionReferences: true
});

// Create API stack with job matching table and recruiter profiles table
const apiStack = new ApiStack(app, `PortfolioApiStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool,
  jobMatchingTable: jobMatchingStack.matchingTable,
  recruiterProfilesTable: jobMatchingStack.recruiterProfilesTable,
  bedrockModelId: process.env.BEDROCK_MODEL_ID
});

// Create pipeline stacks (separate from application deployment)
const skipPipeline = process.env.CODEBUILD_BUILD_ID || process.env.SKIP_PIPELINE;
if (!skipPipeline) {
  const githubOwner = process.env.GITHUB_OWNER || 'loxosceles';
  const githubRepo = process.env.GITHUB_REPO || 'ai-portfolio-frontend';

  // Create dev pipeline
  new PipelineStack(app, 'PortfolioPipelineStack-dev', {
    stage: 'dev',
    env,
    githubOwner,
    githubRepo,
    githubBranch: 'dev'
  });

  // Create prod pipeline
  new PipelineStack(app, 'PortfolioPipelineStack-prod', {
    stage: 'prod',
    env,
    githubOwner,
    githubRepo,
    githubBranch: 'main'
  });
}

// Add dependencies
webStack.addDependency(sharedStack);
jobMatchingStack.addDependency(sharedStack);
jobMatchingStack.addDependency(webStack); // Job matching depends on web stack for CloudFront domain
apiStack.addDependency(sharedStack);
apiStack.addDependency(jobMatchingStack);

app.synth();
