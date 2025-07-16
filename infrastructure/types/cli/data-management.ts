/**
 * Data Management CLI types
 */
import { DataCollection, DataItem } from '../data';

/**
 * Options for data management operations
 */
export interface DataManagementOptions {
  verbose?: boolean;
  output?: string;
  region?: string;
}

/**
 * Command options for data management CLI
 */
export interface DataManagementCommandOptions {
  verbose?: boolean;
  output?: string;
  region?: string;
}

/**
 * Result of data management operations
 */
export interface DataManagementResult {
  success: boolean;
  message: string;
  data?: DataCollection<DataItem>;
  error?: Error;
}
