import { EnvironmentManager } from '../../lib/core/env-manager';
import { EnvironmentManagerConfig } from '../../types/config';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Mock fs, fsSync and dotenv
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('dotenv');

// Mock environment
process.env.ENVIRONMENT = 'dev';

describe('EnvironmentManager', () => {
  // Test configuration
  const testConfig: EnvironmentManagerConfig = {
    projectRoot: '/test/project/root',
    supportedStages: ['dev', 'prod'],
    envPaths: {
      base: 'infrastructure/.env',
      stage: (stage: string) => `infrastructure/.env.${stage}`
    },
    serviceConfigs: {
      frontend: {
        envPath: 'frontend/.env.local',
        requiredParams: ['API_KEY', 'API_URL'],
        prefix: 'NEXT_PUBLIC_',
        additionalParams: {}
      },
      'link-generator': {
        envPath: 'link-generator/.env',
        requiredParams: ['TABLE_NAME'],
        prefix: '',
        additionalParams: {
          REGION: 'us-east-1'
        }
      }
    }
  };

  // Create manager instance
  const envManager = new EnvironmentManager(testConfig);

  // Save original process.env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv };

    // Reset mocks
    jest.resetAllMocks();

    // Mock dotenv.config
    (dotenv.config as jest.Mock).mockReturnValue({ parsed: { BASE_VAR: 'base_value' } });

    // Mock dotenv.parse
    (dotenv.parse as jest.Mock).mockReturnValue({ STAGE_VAR: 'stage_value' });

    // Mock fs.readFileSync
    (fsSync.readFileSync as jest.Mock).mockReturnValue('STAGE_VAR=stage_value');

    // Mock fs.mkdir
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    // Mock fs.writeFile
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    // Restore process.env
    process.env = originalEnv;
  });

  describe('validateStage', () => {
    test('should validate supported stage', () => {
      expect(envManager.validateStage('dev')).toBe(true);
      expect(envManager.validateStage('prod')).toBe(true);
    });

    test('should throw error for unsupported stage', () => {
      expect(() => envManager.validateStage('invalid')).toThrow(
        'Invalid stage: invalid. Must be one of: dev, prod'
      );
    });
  });

  describe('loadEnv', () => {
    test('should load base environment variables', () => {
      const env = envManager.loadEnv();

      expect(dotenv.config).toHaveBeenCalledWith({
        path: path.join(testConfig.projectRoot, testConfig.envPaths.base)
      });

      expect(env).toEqual({
        BASE_VAR: 'base_value'
      });
    });

    test('should load base and stage-specific environment variables', () => {
      const env = envManager.loadEnv('dev');

      expect(dotenv.config).toHaveBeenCalledWith({
        path: path.join(testConfig.projectRoot, testConfig.envPaths.base)
      });

      expect(fsSync.readFileSync).toHaveBeenCalledWith(
        path.join(testConfig.projectRoot, testConfig.envPaths.stage('dev')),
        'utf-8'
      );

      expect(dotenv.parse).toHaveBeenCalledWith('STAGE_VAR=stage_value');

      expect(env).toEqual({
        BASE_VAR: 'base_value',
        STAGE_VAR: 'stage_value'
      });
    });

    test('should handle missing stage-specific file', () => {
      // Mock fs.readFileSync to throw
      (fsSync.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const env = envManager.loadEnv('dev');

      expect(dotenv.config).toHaveBeenCalled();
      expect(fsSync.readFileSync).toHaveBeenCalled();
      expect(dotenv.parse).not.toHaveBeenCalled();

      expect(env).toEqual({
        BASE_VAR: 'base_value'
      });
    });

    test('should throw error for unsupported stage', () => {
      expect(() => envManager.loadEnv('invalid')).toThrow(
        'Invalid stage: invalid. Must be one of: dev, prod'
      );
    });
  });

  describe('validateEnv', () => {
    test('should return empty array when all required variables are present', () => {
      const env = {
        API_KEY: 'test-key',
        API_URL: 'https://test.com'
      };

      const missing = envManager.validateEnv(env, ['API_KEY', 'API_URL']);

      expect(missing).toEqual([]);
    });

    test('should return missing variables', () => {
      const env = {
        API_KEY: 'test-key'
      };

      const missing = envManager.validateEnv(env, ['API_KEY', 'API_URL']);

      expect(missing).toEqual(['API_URL']);
    });
  });

  describe('writeEnvFile', () => {
    test('should write environment file', async () => {
      await envManager.writeEnvFile('/test/path/.env', 'TEST_VAR=value\n');

      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname('/test/path/.env'), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith('/test/path/.env', 'TEST_VAR=value\n');
    });
  });

  describe('generateServiceEnvContent', () => {
    test('should generate environment file content for frontend service', () => {
      const params = {
        API_KEY: 'test-key',
        API_URL: 'https://test.com'
      };

      const content = envManager.generateServiceEnvContent('frontend', params);

      expect(content).toBe(
        '# Generated environment file - DO NOT EDIT\n' +
          'NEXT_PUBLIC_API_KEY=test-key\n' +
          'NEXT_PUBLIC_API_URL=https://test.com\n'
      );
    });

    test('should generate environment file content with additional parameters', () => {
      const params = {
        TABLE_NAME: 'test-table'
      };

      const content = envManager.generateServiceEnvContent('link-generator', params);

      expect(content).toBe(
        '# Generated environment file - DO NOT EDIT\n' +
          'TABLE_NAME=test-table\n' +
          'REGION=us-east-1\n'
      );
    });

    test('should throw error for missing required parameters', () => {
      const params = {
        API_KEY: 'test-key'
      };

      expect(() => envManager.generateServiceEnvContent('frontend', params)).toThrow(
        'Missing required parameter: API_URL'
      );
    });

    test('should throw error for unknown service', () => {
      const params = {
        API_KEY: 'test-key'
      };

      expect(() => envManager.generateServiceEnvContent('unknown', params)).toThrow(
        'Unknown service: unknown'
      );
    });
  });
});
