#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '@/lib/stacks/api-stack';
import { SharedStack } from '@/lib/stacks/shared-stack';

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
  env
});

// Create API stack
const apiStack = new ApiStack(app, `PortfolioApiStack-${stage}`, {
  stage: stage as 'dev' | 'prod',
  env,
  userPool: sharedStack.userPool
});

// Add dependencies
apiStack.addDependency(sharedStack);

app.synth();
