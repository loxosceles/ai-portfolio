// Admin configuration following CLI patterns from configs/aws-config.ts
const ADMIN_CONFIG = {
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
    dataDir: '../data/{stage}',
    stateFile: '../data/.admin-state.json'
  }
};

export default ADMIN_CONFIG;
