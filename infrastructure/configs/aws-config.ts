import { Stage } from '../types/common';
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IAWSManagerConfig } from '../types/config/aws-config';

// Valid regions for AWS operations
export const VALID_REGIONS = ['eu-central-1', 'us-east-1'];

// Parameter schema by stage and region
export const PARAMETER_SCHEMA: Record<Stage, Record<string, string[]>> = {
  dev: {
    'eu-central-1': [
      'BEDROCK_MODEL_ID',
      'CDK_DEFAULT_ACCOUNT',
      'CDK_DEFAULT_REGION',
      'AWS_REGION_DEFAULT',
      'AWS_REGION_DISTRIB',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'DATA_BUCKET_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': []
  },
  prod: {
    'eu-central-1': [
      'BEDROCK_MODEL_ID',
      'CDK_DEFAULT_ACCOUNT',
      'CDK_DEFAULT_REGION',
      'AWS_REGION_DEFAULT',
      'AWS_REGION_DISTRIB',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'DATA_BUCKET_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': ['CERTIFICATE_ARN', 'PROD_DOMAIN_NAME']
  },
  test: {
    'eu-central-1': [
      'BEDROCK_MODEL_ID',
      'CDK_DEFAULT_ACCOUNT',
      'CDK_DEFAULT_REGION',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'DATA_BUCKET_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': []
  }
};

// Data management constants
export const DATA_CONFIG = {
  dataFiles: {
    developers: 'developer.json',
    projects: 'projects.json',
    recruiters: 'recruiters.json'
  },
  schemaFiles: {
    developers: 'developer-schema.json',
    projects: 'projects-schema.json',
    recruiters: 'recruiters-schema.json'
  },
  s3PathTemplate: 'data/{fileName}',
  schemaPathTemplate: 'schemas/{schemaFile}',
  localPathTemplate: 'infrastructure/data/{stage}',
  localDataPathTemplate: 'infrastructure/data/{stage}/data',
  localSchemaPathTemplate: 'infrastructure/data/{stage}/schemas'
};

// Service region mapping
export const SERVICE_REGIONS = {
  cloudfront: 'us-east-1',
  web: 'us-east-1',
  api: 'eu-central-1',
  data: 'eu-central-1'
} as const;

// Stack configuration constants
export const STACK_TYPES = ['web', 'api', 'shared', 'linkGenerator', 'aiAdvocate'] as const;

export const STACK_PREFIXES = {
  web: 'PortfolioWebStack',
  api: 'PortfolioApiStack',
  shared: 'PortfolioSharedStack',
  linkGenerator: 'PortfolioLinkGeneratorStack',
  aiAdvocate: 'AIAdvocateStack'
} as const;

export const STACK_REGIONS = {
  web: 'us-east-1',
  api: 'eu-central-1',
  shared: 'eu-central-1',
  linkGenerator: 'eu-central-1',
  aiAdvocate: 'eu-central-1'
} as const;

// AWS Manager Configuration
export const awsManagerConfig: IAWSManagerConfig = {
  projectRoot,
  supportedStages: [...SUPPORTED_STAGES],
  validRegions: VALID_REGIONS,
  serviceRegions: SERVICE_REGIONS,
  stackPrefixes: STACK_PREFIXES,
  parameterSchema: PARAMETER_SCHEMA
};
