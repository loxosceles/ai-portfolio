/**
 * SSM Parameter Manager Configuration
 */
import { IBaseManagerConfig } from './base-config';

/**
 * AWS Manager Configuration
 */
export interface IAWSManagerConfig extends IBaseManagerConfig {
  validRegions: string[];
  serviceRegions: Record<string, string>;
  stackPrefixes: Record<string, string>;
  parameterSchema: Record<string, Record<string, string[]>>;
}
