/**
 * Environment manager configuration
 */
import { IBaseManagerConfig } from './base-config';

/**
 * Service configuration
 */
export interface IServiceConfig {
  envPath: string;
  requiredParams: string[];
  prefix: string;
  additionalParams?: Record<string, string>;
}

/**
 * Infrastructure environment paths configuration
 */
export interface IInfrastructureEnvPaths {
  base: string;
  stage: (stage: string) => string;
  runtime: string;
}

/**
 * Environment manager configuration
 */
export interface IEnvironmentManagerConfig extends IBaseManagerConfig {
  infrastructureEnvPaths: IInfrastructureEnvPaths;
  serviceConfigs: Record<string, IServiceConfig>;
}
