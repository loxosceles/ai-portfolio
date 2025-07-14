/**
 * Base Configuration
 *
 * Basic shared constants used by multiple managers
 */
import * as path from 'path';
import { SUPPORTED_STAGES, Stage } from '../types/common';

export const projectRoot = path.resolve(__dirname, '../..');
export { SUPPORTED_STAGES, Stage };
