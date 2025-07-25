/**
 * Stack Manager Configuration
 */
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IEnvironmentManagerConfig } from '../types/config';
import { INFRASTRUCTURE_ENV_PATHS } from './env-config';

// Define required variables for each stack
export const STACK_CONFIGS = {
  api: {
    requiredVars: ['DATA_BUCKET_NAME', 'AWS_REGION_DEFAULT']
  },
  web: {
    requiredVars: []
  },
  aiAdvocate: {
    requiredVars: ['BEDROCK_MODEL_ID', 'AWS_REGION_DEFAULT']
  },
  shared: {
    requiredVars: ['AWS_ADMIN_ARN']
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
