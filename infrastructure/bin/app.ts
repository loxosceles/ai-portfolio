#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { SharedStack } from '../lib/stacks/shared-stack';
import { JobMatchingStack } from '../lib/stacks/job-matching-stack';

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

// Create API stack
const apiStack = new ApiStack(app, `PortfolioApiStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool
});

// Create Job Matching stack
const jobMatchingStack = new JobMatchingStack(app, `JobMatchingStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool
});

// Create combined website stack in us-east-1
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

// Add dependencies
apiStack.addDependency(sharedStack);
jobMatchingStack.addDependency(sharedStack);
webStack.addDependency(apiStack);
webStack.addDependency(jobMatchingStack);

app.synth();
