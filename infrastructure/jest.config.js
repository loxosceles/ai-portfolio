module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(@aws-sdk)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.mjs$': '$1'
  },
  setupFilesAfterEnv: ['./test/setup/environment.ts'], // Only need environment setup
  // Speed optimizations
  cache: true,
  maxConcurrency: 5,
  testTimeout: 5000,
  // Optimize for parallel execution
  maxWorkers: '50%', // Use 50% of available cores
  bail: false
};
