import { EnvironmentManager } from '../../lib/core/env-manager';
import { IEnvironmentManagerConfig } from '../../types/config';
import { StackEnvMap } from '../../types';
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
  const testConfig: IEnvironmentManagerConfig = {
    projectRoot: '/test/project/root',
    supportedStages: ['dev', 'prod'],
    infrastructureEnvPaths: {
      base: 'infrastructure/.env',
      stage: (stage: string) => `infrastructure/.env.${stage}`,
      runtime: 'infrastructure/.env.runtime'
    },
    serviceConfigs: {
      frontend: {
        type: 'frontend' as const,
        envPath: 'frontend/.env.local',
        requiredParams: ['API_KEY', 'API_URL'],
        prefix: 'NEXT_PUBLIC_',
        additionalParams: {}
      },
      'link-generator': {
        type: 'link-generator' as const,
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
        path: path.join(testConfig.projectRoot, testConfig.infrastructureEnvPaths.base)
      });

      expect(env).toEqual({
        BASE_VAR: 'base_value'
      });
    });

    test('should load base and stage-specific environment variables', () => {
      const env = envManager.loadEnv('dev');

      expect(dotenv.config).toHaveBeenCalledWith({
        path: path.join(testConfig.projectRoot, testConfig.infrastructureEnvPaths.base)
      });

      expect(fsSync.readFileSync).toHaveBeenCalledWith(
        path.join(testConfig.projectRoot, testConfig.infrastructureEnvPaths.stage('dev')),
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
        "Service 'unknown' not configured. Available services: frontend, link-generator"
      );
    });
  });

  describe('Stack Variables (Base/Prod/Optional)', () => {
    let stackEnvManager: EnvironmentManager;
    let stackConfig: IEnvironmentManagerConfig;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      stackConfig = {
        projectRoot: '/test',
        supportedStages: ['dev', 'prod'],
        infrastructureEnvPaths: {
          base: 'infrastructure/.env',
          stage: (stage: string) => `infrastructure/.env.${stage}`,
          runtime: 'infrastructure/.env'
        },
        serviceConfigs: {
          stack: {
            type: 'stack',
            stackConfigs: {
              web: {
                base: [],
                prod: ['PROD_DOMAIN_NAME', 'CERTIFICATE_ARN'],
                optional: ['PROD_DOMAIN_NAME', 'CERTIFICATE_ARN']
              },
              api: {
                base: ['DATA_BUCKET_NAME', 'AWS_REGION_DEFAULT'],
                prod: [],
                optional: []
              }
            }
          }
        }
      };

      process.env.ENVIRONMENT = 'dev';
      stackEnvManager = new EnvironmentManager(stackConfig);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      delete process.env.ENVIRONMENT;
      jest.clearAllMocks();
    });

    describe('getStackEnv - Web Stack (Production Variables)', () => {
      it('should handle dev stage with no production variables required', () => {
        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.dev')) {
              return 'SOME_VAR=value';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({ SOME_VAR: 'value' });

        const result = stackEnvManager.getStackEnv('web');

        expect(result).toEqual({
          stage: 'dev'
        });
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should handle prod stage with all production variables present', () => {
        process.env.ENVIRONMENT = 'prod';
        stackEnvManager = new EnvironmentManager(stackConfig);

        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.prod')) {
              return 'PROD_DOMAIN_NAME=example.com\nCERTIFICATE_ARN=arn:aws:acm:cert';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({
          PROD_DOMAIN_NAME: 'example.com',
          CERTIFICATE_ARN: 'arn:aws:acm:cert'
        });

        const result = stackEnvManager.getStackEnv('web');

        expect(result).toEqual({
          stage: 'prod',
          prodDomainName: 'example.com',
          certificateArn: 'arn:aws:acm:cert'
        });
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should warn about missing optional production variables', () => {
        process.env.ENVIRONMENT = 'prod';
        stackEnvManager = new EnvironmentManager(stackConfig);

        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.prod')) {
              return 'PROD_DOMAIN_NAME=example.com';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({ PROD_DOMAIN_NAME: 'example.com' });

        const result = stackEnvManager.getStackEnv('web');

        expect(result).toEqual({
          stage: 'prod',
          prodDomainName: 'example.com'
        });
        expect(consoleSpy).toHaveBeenCalledWith(
          'Warning: Optional variables not found for web stack: CERTIFICATE_ARN'
        );
      });
    });

    describe('getStackEnv - API Stack (Required Variables)', () => {
      it('should succeed when all required base variables are present', () => {
        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.dev')) {
              return 'DATA_BUCKET_NAME=test-bucket\nAWS_REGION_DEFAULT=us-east-1';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({
          DATA_BUCKET_NAME: 'test-bucket',
          AWS_REGION_DEFAULT: 'us-east-1'
        });

        const result = stackEnvManager.getStackEnv('api');

        expect(result).toEqual({
          stage: 'dev',
          dataBucketName: 'test-bucket',
          awsRegionDefault: 'us-east-1'
        });
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it('should throw error when required base variables are missing', () => {
        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.dev')) {
              return 'DATA_BUCKET_NAME=test-bucket';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({ DATA_BUCKET_NAME: 'test-bucket' });

        expect(() => stackEnvManager.getStackEnv('api')).toThrow(
          'Missing required environment variables for api stack: AWS_REGION_DEFAULT'
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error for unknown stack', () => {
        (fsSync.readFileSync as jest.Mock).mockImplementation(() => 'VAR=value');

        expect(() => stackEnvManager.getStackEnv('unknownStack' as keyof StackEnvMap)).toThrow(
          'Unknown stack: unknownStack'
        );
      });

      it('should throw error when stack service config is missing', () => {
        const badConfig = {
          ...stackConfig,
          serviceConfigs: {}
        };
        const badEnvManager = new EnvironmentManager(badConfig);

        expect(() => badEnvManager.getStackEnv('web')).toThrow(
          'Stack service configuration not found'
        );
      });
    });

    describe('CamelCase Conversion', () => {
      it('should convert SNAKE_CASE variables to camelCase properties', () => {
        (dotenv.config as jest.Mock).mockReturnValue({ parsed: {} });
        (fsSync.readFileSync as jest.Mock).mockImplementation(
          (filePath: fsSync.PathOrFileDescriptor) => {
            if (filePath.toString().includes('.env.dev')) {
              return 'DATA_BUCKET_NAME=test-bucket\nAWS_REGION_DEFAULT=us-east-1';
            }
            return 'BASE_VAR=base_value';
          }
        );
        (dotenv.parse as jest.Mock).mockReturnValue({
          DATA_BUCKET_NAME: 'test-bucket',
          AWS_REGION_DEFAULT: 'us-east-1'
        });

        const result = stackEnvManager.getStackEnv('api');

        expect(result).toHaveProperty('dataBucketName', 'test-bucket');
        expect(result).toHaveProperty('awsRegionDefault', 'us-east-1');
        expect(result).not.toHaveProperty('DATA_BUCKET_NAME');
        expect(result).not.toHaveProperty('AWS_REGION_DEFAULT');
      });
    });
  });
});
