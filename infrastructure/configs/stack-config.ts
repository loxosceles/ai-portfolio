/**
 * Stack Manager Configuration
 */
import { projectRoot, SUPPORTED_STAGES } from './base';
import { IEnvironmentManagerConfig } from '../types/config';
import { INFRASTRUCTURE_ENV_PATHS } from './env-config';

// Define required variables for each stack
export const STACK_CONFIGS = {
  api: {
    requiredVars: [
      'DEVELOPER_TABLE_NAME',
      'PROJECTS_TABLE_NAME',
      'DATA_BUCKET_NAME',
      'AWS_REGION_DEFAULT'
    ]
  },
  web: {
    requiredVars: ['VISITOR_TABLE_NAME', 'AWS_REGION_DEFAULT']
  },
  aiAdvocate: {
    requiredVars: [
      'BEDROCK_MODEL_ID',
      'AWS_REGION_DEFAULT',
      'DEVELOPER_TABLE_NAME',
      'PROJECTS_TABLE_NAME'
    ]
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
