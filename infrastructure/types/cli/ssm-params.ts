/**
 * SSM Parameter CLI types
 */
import { Stage } from '../common';

/**
 * Options for SSM parameter export operations
 */
export interface ExportOptions {
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
export interface ExportResult {
  success: boolean;
  message: string;
  errorCount: number;
  content: string;
}
