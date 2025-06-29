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

// Load environment variables from .env file
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

const app = new cdk.App();

if (!process.env.CDK_DEFAULT_ACCOUNT || !process.env.CDK_DEFAULT_REGION) {
  throw new Error('CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION must be set');
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

// Create API stack with job matching table
const apiStack = new ApiStack(app, `PortfolioApiStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool,
  jobMatchingTable: jobMatchingStack.matchingTable,
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-lite-v1'
});

// Create pipeline stack (only for dev environment initially)
if (stage === 'dev') {
  // Get GitHub info from environment or CodeBuild context
  const githubOwner = process.env.GITHUB_OWNER || 'loxosceles';
  const githubRepo = process.env.GITHUB_REPO || 'ai-portfolio-frontend';

  // Only create pipeline stack if we're not in a deployment context
  // (pipeline stack should be deployed separately, not during application deployment)
  const skipPipeline = process.env.CODEBUILD_BUILD_ID || process.env.SKIP_PIPELINE;

  if (!skipPipeline) {
    new PipelineStack(app, `PortfolioPipelineStack-${stage}`, {
      stage,
      env, // Uses eu-central-1 from main env
      githubOwner,
      githubRepo,
      githubBranch: stage === 'prod' ? 'main' : 'feat/optimize-frontend-authentication'
    });
  }
}

// Add dependencies
webStack.addDependency(sharedStack);
jobMatchingStack.addDependency(sharedStack);
jobMatchingStack.addDependency(webStack); // Job matching depends on web stack for CloudFront domain
apiStack.addDependency(sharedStack);
apiStack.addDependency(jobMatchingStack);

app.synth();
