import * as path from 'path';
import { fileURLToPath } from 'url';

// Get project root (same pattern as CLI configs)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// Admin configuration following CLI patterns from configs/aws-config.ts
const ADMIN_CONFIG = {
  // Project root (same as CLI)
  projectRoot,

  // Regions configuration (reuse CLI pattern)
  regions: {
    dynamodb: 'eu-central-1',
    ssm: 'eu-central-1'
  },

  // Data types configuration (reuse DATA_CONFIG pattern)
  dataTypes: {
    developer: {
      file: 'developer.json',
      ssmParam: 'DEVELOPER_TABLE_NAME',
      isSingle: true
    },
    projects: {
      file: 'projects.json',
      ssmParam: 'PROJECTS_TABLE_NAME',
      isSingle: false
    },
    recruiters: {
      file: 'recruiters.json',
      ssmParam: 'RECRUITER_PROFILES_TABLE_NAME',
      isSingle: false
    }
  },

  // Path templates (reuse CLI template patterns)
  paths: {
    ssmTemplate: '/portfolio/{stage}/{paramName}',
    dataTemplate: 'data/{stage}',
    stateFile: 'data/.admin-state.json'
  },

  // Cognito configuration
  cognito: {
    userPoolParam: 'COGNITO_USER_POOL_ID',
    region: 'eu-central-1'
  }
};

export default ADMIN_CONFIG;
