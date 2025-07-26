/**
 * Stack Manager Configuration
 */
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IEnvironmentManagerConfig } from '../types/config';
import { INFRASTRUCTURE_ENV_PATHS } from './env-config';

// Define required variables for each stack
export const STACK_CONFIGS = {
  api: {
    base: ['DATA_BUCKET_NAME', 'AWS_REGION_DEFAULT'],
    prod: [],
    optional: []
  },
  web: {
    base: [],
    prod: ['PROD_DOMAIN_NAME', 'CERTIFICATE_ARN'],
    optional: ['PROD_DOMAIN_NAME', 'CERTIFICATE_ARN']
  },
  aiAdvocate: {
    base: ['BEDROCK_MODEL_ID', 'AWS_REGION_DEFAULT', 'APPSYNC_API_ID'],
    prod: [],
    optional: []
  },
  shared: {
    base: ['AWS_ADMIN_ARN'],
    prod: ['COGNITO_USER_POOL_ID'],
    optional: ['COGNITO_USER_POOL_ID']
  }
};

// Stack Manager Configuration
export const stackManagerConfig: IEnvironmentManagerConfig = {
  projectRoot,
  supportedStages: [...SUPPORTED_STAGES],
  infrastructureEnvPaths: INFRASTRUCTURE_ENV_PATHS,
  serviceConfigs: {
    stack: {
      type: 'stack' as const,
      stackConfigs: STACK_CONFIGS
    }
  }
};
