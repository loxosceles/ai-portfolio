/**
 * Environment Manager Configuration
 */
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IEnvironmentManagerConfig } from '../types/config';

// Infrastructure environment file paths
export const INFRASTRUCTURE_ENV_PATHS = {
  base: 'infrastructure/.env',
  stage: (stage: string) => `infrastructure/.env.${stage}`,
  runtime: 'infrastructure/.env' // For CI/CodeBuild environments
};

// Service configurations
export const SERVICE_CONFIGS = {
  frontend: {
    type: 'frontend' as const,
    envPath: 'frontend/.env.local',
    requiredParams: [
      'APPSYNC_API_KEY',
      'APPSYNC_URL',
      'AWS_REGION_DEFAULT',
      'COGNITO_CLIENT_ID',
      'COGNITO_DOMAIN_NAME',
      'COGNITO_AUTHORITY',
      'COGNITO_USER_POOL_ID'
    ],
    prefix: 'NEXT_PUBLIC_',
    additionalParams: {}
  },
  'link-generator': {
    type: 'link-generator' as const,
    envPath: 'link-generator/.env',
    requiredParams: [
      'VISITOR_TABLE_NAME',
      'COGNITO_USER_POOL_ID',
      'COGNITO_CLIENT_ID',
      'CLOUDFRONT_DOMAIN'
    ],
    prefix: '',
    additionalParams: {
      AWS_REGION_DISTRIB: 'us-east-1',
      AWS_REGION_DEFAULT: 'eu-central-1',
      OUTPUT_FILE_PATH: './link.txt'
    }
  }
};

// Configuration object for EnvironmentManager
export const envManagerConfig: IEnvironmentManagerConfig = {
  projectRoot,
  supportedStages: [...SUPPORTED_STAGES],
  infrastructureEnvPaths: INFRASTRUCTURE_ENV_PATHS,
  serviceConfigs: SERVICE_CONFIGS
};
