import { Stage } from '../types/common';
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IBaseManagerConfig } from '../types/config';

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
      'DEVELOPER_TABLE_NAME',
      'PROJECTS_TABLE_NAME',
      'RECRUITER_PROFILES_TABLE_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': ['VISITOR_TABLE_NAME']
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
      'DEVELOPER_TABLE_NAME',
      'PROJECTS_TABLE_NAME',
      'RECRUITER_PROFILES_TABLE_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': ['CERTIFICATE_ARN', 'PROD_DOMAIN_NAME', 'VISITOR_TABLE_NAME']
  },
  test: {
    'eu-central-1': [
      'BEDROCK_MODEL_ID',
      'CDK_DEFAULT_ACCOUNT',
      'CDK_DEFAULT_REGION',
      'GITHUB_OWNER',
      'GITHUB_REPO',
      'DATA_BUCKET_NAME',
      'DEVELOPER_TABLE_NAME',
      'PROJECTS_TABLE_NAME',
      'RECRUITER_PROFILES_TABLE_NAME',
      'AWS_ADMIN_ARN'
    ],
    'us-east-1': ['VISITOR_TABLE_NAME']
  }
};

// Data management constants
export const DATA_CONFIG = {
  dataFiles: {
    developers: 'developer.json',
    projects: 'projects.json'
  },
  s3PathTemplate: '{stage}/{fileName}',
  localPathTemplate: 'data/{stage}'
};

// Service region mapping
export const SERVICE_REGIONS = {
  cloudfront: 'us-east-1',
  web: 'us-east-1',
  api: 'eu-central-1',
  data: 'eu-central-1'
} as const;

// Stack name patterns
export const STACK_NAME_PATTERNS = {
  web: (stage: string) => `PortfolioWebStack-${stage}`,
  api: (stage: string) => `PortfolioApiStack-${stage}`,
  shared: (stage: string) => `PortfolioSharedStack-${stage}`
} as const;

// AWS Manager Configuration
export const awsManagerConfig: IBaseManagerConfig = {
  projectRoot,
  supportedStages: [...SUPPORTED_STAGES]
};
