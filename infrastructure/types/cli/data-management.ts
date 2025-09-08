/**
 * Data Management CLI types
 */
import { IDataCollection, IDataItem } from '../data';

/**
 * Options for data management operations
 */
export interface IDataManagementOptions {
  verbose: boolean;
  output?: string;
  region?: string;
  useDownloadedSchemas?: boolean;
}

/**
 * Command options for data management CLI
 */
export interface IDataManagementCommandOptions {
  verbose?: boolean;
  output?: string;
  region?: string;
}

/**
 * Result of data management operations
 */
export interface IDataManagementResult {
  success: boolean;
  message: string;
  data?: IDataCollection<IDataItem>;
  error?: Error;
}
