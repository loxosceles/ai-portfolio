/**
 * Comprehensive tests for WebStack environment variable handling
 * Tests both basic functionality and domain-specific CloudFront configuration
 */
import { EnvironmentManager } from '../../lib/core/env-manager';
import { IEnvironmentManagerConfig } from '../../types/config';
import { stackManagerConfig } from '../../configs/stack-config';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Test constants - fake values to prevent exposure of sensitive data
const FAKE_DOMAIN = 'example.com';
const FAKE_AWS_ARN = 'arn:aws:iam::123456789012:user/testuser';
const FAKE_CERTIFICATE_ARN =
  'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012';

describe('WebStack Environment Variables', () => {
  let envManager: EnvironmentManager;
  let mockConfig: IEnvironmentManagerConfig;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.ENVIRONMENT = 'dev';
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockConfig = {
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
            }
          }
        }
      }
    };

    envManager = new EnvironmentManager(mockConfig);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete process.env.ENVIRONMENT;
    delete process.env.AWS_REGION_DEFAULT;
    jest.clearAllMocks();
  });

  describe('Development Stage', () => {
    it('should provide correct web stack environment for dev stage', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (filePath.toString().includes('.env.dev')) {
          return 'OTHER_VAR=value';
        }
        return 'BASE_VAR=base_value';
      });

      const webStackEnv = envManager.getStackEnv('web');

      expect(webStackEnv).toEqual({
        stage: 'dev'
      });
      expect(webStackEnv.prodDomainName).toBeUndefined();
      expect(webStackEnv.certificateArn).toBeUndefined();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not require domain variables in development', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (filePath.toString().includes('.env.dev')) {
          return 'DEV_VAR=value';
        }
        return `AWS_ADMIN_ARN=${FAKE_AWS_ARN}`;
      });

      const webStackEnv = envManager.getStackEnv('web');

      expect(webStackEnv.stage).toBe('dev');
      expect(webStackEnv.prodDomainName).toBeUndefined();
      expect(webStackEnv.certificateArn).toBeUndefined();
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Production Stage - Domain Configuration', () => {
    beforeEach(() => {
      process.env.ENVIRONMENT = 'prod';
      envManager = new EnvironmentManager(mockConfig);
    });

    it('should provide domain variables for CloudFront configuration in production', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (filePath.toString().includes('.env.prod')) {
          return `PROD_DOMAIN_NAME=${FAKE_DOMAIN}\nCERTIFICATE_ARN=${FAKE_CERTIFICATE_ARN}`;
        }
        return `AWS_ADMIN_ARN=${FAKE_AWS_ARN}`;
      });

      const webStackEnv = envManager.getStackEnv('web');

      expect(webStackEnv.stage).toBe('prod');
      expect(webStackEnv.prodDomainName).toBe(FAKE_DOMAIN);
      expect(webStackEnv.certificateArn).toBe(FAKE_CERTIFICATE_ARN);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle missing domain variables gracefully (warn but not fail)', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (filePath.toString().includes('.env.prod')) {
          return 'OTHER_VAR=value'; // Missing domain variables
        }
        return `AWS_ADMIN_ARN=${FAKE_AWS_ARN}`;
      });

      const webStackEnv = envManager.getStackEnv('web');

      expect(webStackEnv.stage).toBe('prod');
      expect(webStackEnv.prodDomainName).toBeUndefined();
      expect(webStackEnv.certificateArn).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: Optional variables not found for web stack: PROD_DOMAIN_NAME, CERTIFICATE_ARN'
      );
    });
  });

  describe('Real Configuration Integration', () => {
    it('should work with actual stack configuration', () => {
      process.env.ENVIRONMENT = 'prod';
      process.env.AWS_REGION_DEFAULT = 'eu-central-1';
      const realEnvManager = new EnvironmentManager(stackManagerConfig);

      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        if (filePath.toString().includes('.env.prod')) {
          return `PROD_DOMAIN_NAME=${FAKE_DOMAIN}\nCERTIFICATE_ARN=${FAKE_CERTIFICATE_ARN}`;
        }
        return `AWS_ADMIN_ARN=${FAKE_AWS_ARN}\nAWS_REGION_DEFAULT=eu-central-1`;
      });

      const webStackEnv = realEnvManager.getStackEnv('web');

      expect(webStackEnv.stage).toBe('prod');
      expect(webStackEnv.prodDomainName).toBe(FAKE_DOMAIN);
      expect(webStackEnv.certificateArn).toBe(FAKE_CERTIFICATE_ARN);
    });
  });
});
