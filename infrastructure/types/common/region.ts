/**
 * Region types and related constants
 */
import { Stage } from './stage';

export interface RegionConfig {
  primary: string;
  distribution: string;
}

export const REGIONS: Record<Stage, RegionConfig> = {
  dev: {
    primary: 'eu-central-1',
    distribution: 'us-east-1'
  },
  prod: {
    primary: 'eu-central-1',
    distribution: 'us-east-1'
  }
};
