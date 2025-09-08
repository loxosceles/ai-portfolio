/**
 * Data Management Command Tests
 *
 * Tests the command handlers directly as the CLI binaries do
 */
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
  handleUploadData,
  handleDownloadData,
  handlePopulateDynamoDB,
  validateData
} from '../../lib/cli/commands/data-management';

// Test configuration
const TEST_DATA = {
  developer: {
    id: 'dev1',
    name: 'Test Developer',
    title: 'Software Engineer',
    bio: 'Test bio',
    email: 'test@example.com',
    website: 'https://test.dev',
    github: 'https://github.com/test',
    linkedin: 'https://linkedin.com/in/test',
    location: 'Test City',
    yearsOfExperience: 5,
    isActive: true,
    skillSets: [{ id: 'skill1', name: 'Frontend', skills: ['React'] }]
  },
  project: {
    id: 'proj1',
    title: 'Test Project',
    slug: 'test-project',
    icon: 'TestIcon',
    description: 'Test description',
    status: 'Active',
    highlights: ['Feature 1'],
    techStack: ['React'],
    githubUrl: 'https://github.com/test/project',
    overview: 'Test overview',
    challenge: 'Test challenge',
    solution: 'Test solution',
    architecture: [
      {
        name: 'Test Architecture',
        details: 'Test architecture details'
      }
    ],
    technicalShowcases: [
      {
        title: 'Test Showcase',
        description: 'Test showcase description',
        highlights: ['Test highlight']
      }
    ],
    archPatterns: ['Test pattern'],
    performance: ['Test performance'],
    repositoryAndDevelopment: {
      plannedFeatures: ['Test feature'],
      vision: 'Test vision'
    },
    developerId: 'dev1'
  }
};

const TEST_PATHS = {
  data: 'data/',
  schemas: 'schemas/'
};

const EXPECTED_MESSAGES = {
  upload: 'Data and schema upload completed successfully',
  download: 'Data and schema download completed successfully',
  populate: 'DynamoDB tables populated successfully'
};

// Helper functions
const getMockFileResponse = (filePath: string) => {
  if (filePath.includes(`${TEST_PATHS.data}developer.json`)) {
    return JSON.stringify([TEST_DATA.developer]);
  } else if (filePath.includes(`${TEST_PATHS.data}projects.json`)) {
    return JSON.stringify([TEST_DATA.project]);
  } else if (filePath.includes(`${TEST_PATHS.data}recruiters.json`)) {
    return '[]';
  } else if (filePath.includes(`${TEST_PATHS.schemas}developer-schema.json`)) {
    return JSON.stringify({ type: 'object', properties: {} });
  } else if (filePath.includes(`${TEST_PATHS.schemas}projects-schema.json`)) {
    return JSON.stringify({ type: 'array', items: { type: 'object' } });
  } else if (filePath.includes(`${TEST_PATHS.schemas}recruiters-schema.json`)) {
    return JSON.stringify({ type: 'array', items: { type: 'object' } });
  }
  return '[]';
};

const getMockS3Response = (key: string) => {
  if (key.includes(`${TEST_PATHS.data}developer.json`)) {
    return [TEST_DATA.developer];
  } else if (key.includes(`${TEST_PATHS.data}projects.json`)) {
    return [TEST_DATA.project];
  } else if (key.includes(`${TEST_PATHS.data}recruiters.json`)) {
    return [];
  } else if (key.includes(TEST_PATHS.schemas)) {
    return { type: 'object', properties: {} };
  }
  return [];
};

// Mock AWS SDK clients
const s3Mock = mockClient(S3Client);
const dynamoDBMock = mockClient(DynamoDBClient);

// Mock the environment manager to avoid file system writes
jest.mock('../../lib/core/env-manager', () => {
  return {
    EnvironmentManager: jest.fn().mockImplementation(() => ({
      loadEnv: jest.fn().mockReturnValue({
        DATA_BUCKET_NAME: 'test-bucket',
        DEVELOPER_TABLE_NAME: 'test-developers',
        PROJECTS_TABLE_NAME: 'test-projects'
      })
    }))
  };
});

// Mock fs to avoid file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((filePath) => {
    return Promise.resolve(getMockFileResponse(filePath.toString()));
  }),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined)
}));

describe('Data Management Command Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Reset mocks
    s3Mock.reset();
    dynamoDBMock.reset();

    originalEnv = { ...process.env };

    // Set up environment
    process.env.ENVIRONMENT = 'test';

    // Mock AWS responses
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(GetObjectCommand).resolves({});

    // Mock AWSManager methods for proper integration testing
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        return Promise.resolve(getMockS3Response(key));
      });

    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'batchWriteToDynamoDB')
      .mockResolvedValue(undefined);

    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'getParameter')
      .mockImplementation((...args: unknown[]) => {
        const paramName = args[0] as string;
        if (paramName.includes('DEVELOPER_TABLE_NAME')) {
          return Promise.resolve('test-developers');
        } else if (paramName.includes('PROJECTS_TABLE_NAME')) {
          return Promise.resolve('test-projects');
        } else if (paramName.includes('RECRUITER_PROFILES_TABLE_NAME')) {
          return Promise.resolve('test-recruiters');
        }
        return Promise.reject(new Error(`Parameter ${paramName} not found`));
      });

    dynamoDBMock.on(PutItemCommand).resolves({});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  test('should handle upload command like CLI', async () => {
    const result = await handleUploadData({
      verbose: false,
      region: undefined
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(EXPECTED_MESSAGES.upload);
    expect(s3Mock.calls().length).toBeGreaterThan(0);
  });

  test('should handle download command like CLI', async () => {
    const result = await handleDownloadData({
      verbose: false,
      output: undefined,
      region: undefined
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(EXPECTED_MESSAGES.download);
  });

  test('should handle populate_ddb_with_static_data command like CLI', async () => {
    const result = await handlePopulateDynamoDB({
      verbose: false,
      region: undefined
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain(EXPECTED_MESSAGES.populate);
  });

  test('should handle region option like CLI', async () => {
    // Mock the validateRegion method to avoid region validation issues
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'validateRegion')
      .mockReturnValue('eu-west-1');

    const result = await handleUploadData({
      verbose: false,
      region: 'eu-west-1'
    });

    expect(result.success).toBe(true);
    expect(s3Mock.calls().length).toBeGreaterThan(0);
  });

  test('should handle missing optional recruiters file gracefully', async () => {
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        if (key.includes('recruiters.json')) {
          const error = new Error('The specified key does not exist.');
          error.name = 'NoSuchKey';
          throw error;
        }
        return Promise.resolve(getMockS3Response(key));
      });

    const result = await handlePopulateDynamoDB({ verbose: false, region: undefined });

    expect(result.success).toBe(true);
    expect(result.message).toContain('DynamoDB tables populated successfully');
  });

  test('should fail when required developers file is missing', async () => {
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        if (key.includes('developer.json')) {
          const error = new Error('The specified key does not exist.');
          error.name = 'NoSuchKey';
          throw error;
        }
        return Promise.resolve(getMockS3Response(key));
      });

    const result = await handlePopulateDynamoDB({ verbose: false, region: undefined });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to populate DynamoDB');
  });

  test('should fail when required projects file is missing', async () => {
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        if (key.includes('projects.json')) {
          const error = new Error('The specified key does not exist.');
          error.name = 'NoSuchKey';
          throw error;
        }
        return Promise.resolve(getMockS3Response(key));
      });

    const result = await handlePopulateDynamoDB({ verbose: false, region: undefined });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to populate DynamoDB');
  });

  test('should handle empty optional recruiters file gracefully', async () => {
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        if (key.includes('recruiters.json')) {
          return Promise.resolve([]);
        }
        return Promise.resolve(getMockS3Response(key));
      });

    const result = await handlePopulateDynamoDB({ verbose: false, region: undefined });

    expect(result.success).toBe(true);
    expect(result.message).toContain('DynamoDB tables populated successfully');
  });

  test('should fail when required developers file is empty', async () => {
    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'downloadJsonFromS3')
      .mockImplementation((...args: unknown[]) => {
        const key = args[1] as string;
        if (key.includes('developer.json')) {
          return Promise.resolve([]);
        }
        return Promise.resolve(getMockS3Response(key));
      });

    const result = await handlePopulateDynamoDB({ verbose: false, region: undefined });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Required data for table 'developers' is missing or empty");
  });

  describe('validation functions', () => {
    const mockSchemaPath = '/tmp/test-schemas';
    const mockStage = 'test';

    test('should validate data successfully with valid schema and data', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const mockFs = require('fs/promises');
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const testData = { id: '1', name: 'Test' };

      const result = await validateData('developers', testData, mockStage, mockSchemaPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return validation errors for invalid data', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const mockFs = require('fs/promises');
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockSchema));

      const testData = { id: '1' }; // Missing required 'name' field

      const result = await validateData('developers', testData, mockStage, mockSchemaPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('required');
    });
  });
});
