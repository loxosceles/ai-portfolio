/**
 * Base Configuration
 *
 * Basic shared constants used by multiple managers
 */
import * as path from 'path';
import { Stage } from '../types/common';
import { IRegionConfig } from '../types/common/region';

// Define supported stages here in the config
export const SUPPORTED_STAGES: Stage[] = ['dev', 'prod', 'test'];

// Define region configuration
export const REGIONS: Record<Stage, IRegionConfig> = {
  dev: {
    primary: 'eu-central-1',
    distribution: 'us-east-1'
  },
  prod: {
    primary: 'eu-central-1',
    distribution: 'us-east-1'
  },
  test: {
    primary: 'eu-central-1',
    distribution: 'us-east-1'
  }
};

export const projectRoot = process.cwd();

// SSM Parameter Store prefix for all parameter paths
export const SSM_PARAMETER_PREFIX = 'portfolio';
