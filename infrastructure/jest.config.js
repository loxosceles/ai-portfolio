module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.js', '**/*.test.mjs'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(@aws-sdk)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.mjs$': '$1'
  },
  setupFiles: ['<rootDir>/test/setup/environment.js'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/console-silence.js'],
  // Speed optimizations
  cache: true,
  maxConcurrency: 5,
  testTimeout: 5000,
  // Optimize for parallel execution
  maxWorkers: '50%', // Use 50% of available cores
  bail: false
};
