/**
 * Options for SSM parameter export operations
 */
export interface IExportOptions {
  regions?: string[];
  format?: 'env' | 'json';
  scope?: string;
  target?: string;
  output?: boolean;
  outputPath?: string;
  verbose?: boolean;
}

/**
 * Result of SSM parameter export operations
 */
export interface IExportResult {
  success: boolean;
  message: string;
  errorCount: number;
  content: string;
}
