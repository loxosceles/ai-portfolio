import path from 'path';

// Get project root using ESM URL approach
const projectRoot = new URL('../..', import.meta.url).pathname;

// Admin configuration following CLI patterns from configs/aws-config.ts
const ADMIN_CONFIG = {
  // Project root (same as CLI)
  projectRoot,

  // Regions configuration (reuse CLI pattern)
  regions: {
    dynamodb: 'eu-central-1',
    ssm: 'eu-central-1'
  },

  // Table configuration
  tables: {
    developer: {
      file: 'developer.json',
      schemaFile: 'developer-schema.json',
      ssmParam: 'DEVELOPER_TABLE_NAME'
    },
    projects: {
      file: 'projects.json',
      schemaFile: 'projects-schema.json',
      ssmParam: 'PROJECTS_TABLE_NAME'
    },
    recruiters: {
      file: 'recruiters.json',
      schemaFile: 'recruiters-schema.json',
      ssmParam: 'RECRUITER_PROFILES_TABLE_NAME'
    }
  },

  // Path templates (reuse CLI template patterns)
  paths: {
    ssmTemplate: '/portfolio/{stage}/{paramName}',
    dataTemplate: 'data',
    schemaTemplate: 'schemas/{schemaFile}',
    stateFile: 'data/.admin-state.json'
  },

  // Cognito configuration
  cognito: {
    userPoolParam: 'COGNITO_USER_POOL_ID',
    region: 'eu-central-1'
  }
};

export default ADMIN_CONFIG;
