/**
 * Data collection types
 */
import { Developer } from './developer';
import { Project } from './project';

/**
 * Base data item
 */
export interface DataItem {
  id: string;
  [key: string]: any;
}

/**
 * Collection of data items
 */
export interface DataCollection<T extends DataItem = DataItem> {
  [key: string]: T[];
}

/**
 * Static data
 */
export interface StaticData {
  developers: Developer[];
  projects: Project[];
}
