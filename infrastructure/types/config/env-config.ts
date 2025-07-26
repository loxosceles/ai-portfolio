/**
 * Environment manager configuration
 */
import { IBaseManagerConfig } from './base-config';

/**
 * Service configuration types
 */
export interface IFrontendServiceConfig {
  type: 'frontend';
  envPath: string;
  requiredParams: string[];
  prefix: string;
  additionalParams?: Record<string, string>;
}

export interface ILinkGeneratorServiceConfig {
  type: 'link-generator';
  envPath: string;
  requiredParams: string[];
  prefix: string;
  additionalParams?: Record<string, string>;
}

export interface IStackServiceConfig {
  type: 'stack';
  stackConfigs: Record<string, { base: string[]; prod: string[]; optional?: string[] }>;
}

/**
 * Union type for all service configurations
 */
export type ServiceConfig =
  | IFrontendServiceConfig
  | ILinkGeneratorServiceConfig
  | IStackServiceConfig;

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
  serviceConfigs: Record<string, ServiceConfig>;
}
