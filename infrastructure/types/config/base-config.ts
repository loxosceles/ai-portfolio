/**
 * Base manager configuration
 */

/**
 * Base configuration for all managers
 */
export interface IBaseManagerConfig {
  projectRoot: string;
  supportedStages: string[];
}

/**
 * AWS Manager specific configuration
 */
export interface IAWSManagerConfig extends IBaseManagerConfig {
  validRegions: string[];
  serviceRegions: Record<string, string>;
  stackPrefixes: Record<string, string>;
  parameterSchema: Record<string, Record<string, string[]>>;
}
