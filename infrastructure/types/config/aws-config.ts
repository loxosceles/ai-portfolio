/**
 * SSM Parameter Manager Configuration
 */
import { IBaseManagerConfig } from './base-config';
import { Stage } from '../common';

/**
 * SSM Parameter Manager Configuration
 */
export interface IAwsManagerConfig extends IBaseManagerConfig {
  ssmBasePath: string;
  validRegions: string[];
  paramConfig: Record<Stage, Record<string, string[]>>;
  dataFiles: {
    developers: string;
    projects: string;
  };
  pathPatterns: {
    s3Path: (stage: string, fileName: string) => string;
    localPath: (stage: string) => string;
  };
}
