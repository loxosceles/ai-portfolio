/**
 * Link Generator CLI types
 */

/**
 * Options for link generator operations
 */
export interface ILinkGeneratorOptions {
  verbose: boolean;
  region?: string;
}

/**
 * Command options for link generator CLI
 */
export interface ILinkGeneratorCommandOptions {
  verbose?: boolean;
  region?: string;
}

/**
 * Result of link generator operations
 */
export interface ILinkGeneratorResult {
  success: boolean;
  message: string;
  linkId?: string;
  link?: string;
  error?: Error;
}
