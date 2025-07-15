import { Stage } from '../common';

export interface ServiceEnvOptions {
  service: string;
  regions: string[];
  verbose?: boolean;
}

export interface ServiceEnvResult {
  success: boolean;
  message: string;
}

export interface ServiceEnvCommandOptions {
  regions: string;
  verbose?: boolean;
}
