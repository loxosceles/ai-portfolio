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

// Get domain name for production with validation
let domainName: string | undefined;
if (stage === 'prod') {
  try {
    // Try SSM parameter first, fallback to environment variable
    domainName = cdk.aws_ssm.StringParameter.valueFromLookup(
      app,
      '/portfolio/prod/PROD_DOMAIN_NAME'
    );
  } catch (error) {
    domainName = process.env.PROD_DOMAIN_NAME;
  }

  if (!domainName || domainName === 'dummy-value-for-/portfolio/prod/PROD_DOMAIN_NAME') {
    console.error('\n❌ PRODUCTION DEPLOYMENT FAILED');
    console.error('Missing required PROD_DOMAIN_NAME for production deployment.');
    console.error('\n📋 To fix this, create the SSM parameter:');
    console.error(
      `aws ssm put-parameter --name "/portfolio/prod/PROD_DOMAIN_NAME" --value "your-domain.com" --type "String" --region us-east-1`
    );
    console.error('\n💡 Replace "your-domain.com" with your actual domain name.');
    console.error('\nAlternatively, set PROD_DOMAIN_NAME environment variable in your pipeline.');
    throw new Error('PROD_DOMAIN_NAME is required for production deployment');
  }
}

// Create combined website stack in us-east-1 first to get the CloudFront domain
const webStack = new WebStack(app, `PortfolioWebStack-${stage}`, {
  stage,
  userPool: sharedStack.userPool,
  userPoolClient: sharedStack.userPoolClient,
  env: {
    account: env.account,
    region: 'us-east-1' // Lambda@Edge must be in us-east-1
  },
  crossRegionReferences: true,
  domainName
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
