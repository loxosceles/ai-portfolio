#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebStack } from '../lib/stacks/web-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { SharedStack } from '../lib/stacks/shared-stack';
import { AIAdvocateStack } from '../lib/stacks/ai-advocate-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';
import { EnvironmentManager } from '../lib/core/env-manager';
import { stackManagerConfig } from '../configs/stack-config';

// Environment manager handles loading environment variables

const app = new cdk.App();

// Get AWS environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// Get environment manager
const envManager = new EnvironmentManager(stackManagerConfig);

// Create shared infrastructure
const sharedStack = new SharedStack(app, `PortfolioSharedStack-${envManager.getStage()}`, {
  env,
  stackEnv: envManager.getStackEnv('shared')
});

// Create combined website stack in us-east-1 first to get the CloudFront domain
new WebStack(app, `PortfolioWebStack-${envManager.getStage()}`, {
  env: {
    account: env.account,
    region: 'us-east-1' // Lambda@Edge must be in us-east-1
  },
  stackEnv: envManager.getStackEnv('web')
});

// Create API stack
const apiStack = new ApiStack(app, `PortfolioApiStack-${envManager.getStage()}`, {
  env,
  userPool: sharedStack.userPool,
  stackEnv: envManager.getStackEnv('api')
});

// Create AI Advocate stack
new AIAdvocateStack(app, `AIAdvocateStack-${envManager.getStage()}`, {
  env,
  developerTable: apiStack.developerTable,
  projectsTable: apiStack.projectsTable,
  stackEnv: envManager.getStackEnv('aiAdvocate')
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
    env,
    githubOwner,
    githubRepo,
    githubBranch: 'dev',
    stackEnv: { stage: 'dev' }
  });

  // Create prod pipeline
  new PipelineStack(app, 'PortfolioPipelineStack-prod', {
    env,
    githubOwner,
    githubRepo,
    githubBranch: 'main',
    stackEnv: { stage: 'prod' }
  });
}

// Add dependencies
apiStack.addDependency(sharedStack);

app.synth();
