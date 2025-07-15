/**
 * Environment manager configuration
 */
import { BaseManagerConfig } from './base-config';

/**
 * Environment paths configuration
 */
export interface EnvPaths {
  base: string;
  stage: (stage: string) => string;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  envPath: string;
  requiredParams: string[];
  prefix: string;
  additionalParams?: Record<string, string>;
}

/**
 * Infrastructure environment paths configuration
 */
export interface InfrastructureEnvPaths {
  base: string;
  stage: (stage: string) => string;
  runtime: string;
}

/**
 * Environment manager configuration
 */
export interface EnvironmentManagerConfig extends BaseManagerConfig {
  infrastructureEnvPaths: InfrastructureEnvPaths;
  serviceConfigs: Record<string, ServiceConfig>;
}
