/**
 * Data collection types
 */
import { IDeveloper } from './developer';
import { IProject } from './project';

/**
 * Base data item
 */
export interface IDataItem {
  id: string;
  [key: string]: unknown;
}

/**
 * Collection of data items
 */
export interface IDataCollection<T extends IDataItem = IDataItem> {
  [key: string]: T[];
}

/**
 * Static data
 */
export interface IStaticData {
  developers: IDeveloper[];
  projects: IProject[];
}
