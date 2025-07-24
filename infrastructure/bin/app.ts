#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { SharedStack } from '../lib/stacks/shared-stack';
import { AIAdvocateStack } from '../lib/stacks/ai-advocate-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';

const environment = process.env.ENVIRONMENT;

dotenv.config({
  path: path.join(__dirname, '..', `.env.${environment}`)
});

// Load common variables from default .env file
dotenv.config({
  path: path.join(__dirname, '..', '.env')
});

const app = new cdk.App();

// Get AWS environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// Get environment manager

// Create shared infrastructure
const sharedStack = new SharedStack(app, `PortfolioSharedStack-${stage}`, {
  stage,
  env
});

// Create combined website stack in us-east-1 first to get the CloudFront domain
new WebStack(app, `PortfolioWebStack-${stage}`, {
  stage,
  env: {
    account: env.account,
    region: 'us-east-1' // Lambda@Edge must be in us-east-1
  }
});

// Create API stack
const apiStack = new ApiStack(app, `PortfolioApiStack-${stage}`, {
  stage,
  env,
  userPool: sharedStack.userPool
});

// Create AI Advocate stack
new AIAdvocateStack(app, `AIAdvocateStack-${stage}`, {
  stage,
  env,
  developerTable: apiStack.developerTable,
  projectsTable: apiStack.projectsTable
});

// Create pipeline stacks (separate from application deployment)
const skipPipeline = process.env.CODEBUILD_BUILD_ID || process.env.SKIP_PIPELINE;
if (!skipPipeline) {
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!githubOwner || !githubRepo) {
    throw new Error('GITHUB_OWNER and GITHUB_REPO must be set for pipeline stacks');
  }

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
apiStack.addDependency(sharedStack);

app.synth();
