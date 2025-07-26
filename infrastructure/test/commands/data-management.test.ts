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
  handlePopulateDynamoDB
} from '../../lib/cli/commands/data-management';

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
    if (filePath.toString().includes('developer.json')) {
      return Promise.resolve(
        JSON.stringify([
          {
            id: 'dev1',
            name: 'Test Developer',
            title: 'Software Engineer',
            bio: 'Test bio',
            email: 'test@example.com',
            skillSets: [{ id: 'skill1', name: 'Frontend', skills: ['React'] }]
          }
        ])
      );
    } else if (filePath.toString().includes('projects.json')) {
      return Promise.resolve(
        JSON.stringify([
          {
            id: 'proj1',
            title: 'Test Project',
            description: 'Test description',
            status: 'Active',
            highlights: ['Feature 1'],
            tech: ['React'],
            developerId: 'dev1'
          }
        ])
      );
    }
    return Promise.resolve('{}');
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
        if (key.includes('developer.json')) {
          return Promise.resolve([
            {
              id: 'dev1',
              name: 'Test Developer',
              title: 'Software Engineer',
              bio: 'Test bio',
              email: 'test@example.com',
              skillSets: [{ id: 'skill1', name: 'Frontend', skills: ['React'] }]
            }
          ]);
        } else if (key.includes('projects.json')) {
          return Promise.resolve([
            {
              id: 'proj1',
              title: 'Test Project',
              description: 'Test description',
              status: 'Active',
              highlights: ['Feature 1'],
              tech: ['React'],
              developerId: 'dev1'
            }
          ]);
        }
        return Promise.resolve([]);
      });

    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'batchWriteToDynamoDB')
      .mockResolvedValue(undefined);

    jest
      .spyOn(require('../../lib/core/aws-manager').AWSManager.prototype, 'getParameter')
      .mockImplementation((paramName: string) => {
        if (paramName.includes('DEVELOPER_TABLE_NAME')) {
          return Promise.resolve('test-developers');
        } else if (paramName.includes('PROJECTS_TABLE_NAME')) {
          return Promise.resolve('test-projects');
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
    expect(result.message).toContain('Data upload completed successfully');
    expect(s3Mock.calls().length).toBeGreaterThan(0);
  });

  test('should handle download command like CLI', async () => {
    const result = await handleDownloadData({
      verbose: false,
      output: undefined,
      region: undefined
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Data download completed successfully');
  });

  test('should handle populate_ddb_with_static_data command like CLI', async () => {
    const result = await handlePopulateDynamoDB({
      verbose: false,
      region: undefined
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('DynamoDB tables populated successfully');
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
});
