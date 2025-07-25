import { AWSManager } from '../../lib/core/aws-manager';
import { awsManagerConfig } from '../../configs/aws-config';
import { mockClient } from 'aws-sdk-client-mock';
import {
  SSMClient,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand
} from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

// Mock all AWS SDK clients
const ssmMock = mockClient(SSMClient);
const s3Mock = mockClient(S3Client);
const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocMock = mockClient(DynamoDBDocumentClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const cloudFrontMock = mockClient(CloudFrontClient);

// Mock fs to avoid file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(JSON.stringify([{ id: 'test', name: 'Test' }])),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockImplementation((path, options) => {
    if (options && options.withFileTypes) {
      return Promise.resolve([
        { name: 'index.html', isDirectory: () => false },
        { name: 'styles.css', isDirectory: () => false }
      ]);
    }
    return Promise.resolve(['index.html', 'styles.css']);
  }),
  stat: jest.fn().mockImplementation(() =>
    Promise.resolve({
      isDirectory: () => false
    })
  )
}));

// Mock glob
jest.mock('glob', () => ({
  sync: jest.fn().mockReturnValue(['test.html', 'test.css'])
}));

const originalEnv = { ...process.env };

describe('AWSManager', () => {
  process.env.ENVIRONMENT = 'dev';
  const awsManager = new AWSManager(awsManagerConfig);

  // Spy on console.error to suppress output during tests
  let consoleErrorSpy: jest.SpyInstance;

  // Spy on console logs
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();

    ssmMock.reset();
    s3Mock.reset();
    dynamoDBMock.reset();
    dynamoDBDocMock.reset();
    cloudFormationMock.reset();
    cloudFrontMock.reset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  describe('SSM Operations', () => {
    test('should put parameter', async () => {
      ssmMock.on(PutParameterCommand).resolves({});

      await awsManager.putParameter('/test/param', 'value', 'us-east-1');

      expect(ssmMock.calls()).toHaveLength(1);
      expect(ssmMock.call(0).args[0].input).toEqual({
        Name: '/test/param',
        Value: 'value',
        Type: 'String',
        Overwrite: true
      });
    });

    test('should get parameters by path', async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [{ Name: '/portfolio/dev/stack/TEST_KEY', Value: 'custom-value' }]
      });

      const result = await awsManager.getParametersByPath('/portfolio/dev/stack', 'us-east-1');

      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe('/portfolio/dev/stack/TEST_KEY');
      expect(result[0].Value).toBe('custom-value');
    });

    test('should handle SSM errors', async () => {
      ssmMock.on(GetParametersByPathCommand).rejects(new Error('SSM error'));

      const result = await awsManager.getParametersByPath('/portfolio/dev/stack', 'us-east-1');

      expect(result).toEqual([]);
    });

    test('should delete parameter', async () => {
      ssmMock.on(DeleteParameterCommand).resolves({});

      await awsManager.deleteParameter('/test/param', 'us-east-1');

      expect(ssmMock.calls()).toHaveLength(1);
      expect(ssmMock.call(0).args[0].input).toEqual({
        Name: '/test/param'
      });
    });

    test('should delete parameters by path', async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: '/test/param1', Value: 'value1' },
          { Name: '/test/param2', Value: 'value2' }
        ]
      });
      ssmMock.on(DeleteParameterCommand).resolves({});

      const result = await awsManager.deleteParametersByPath('/test', 'us-east-1');

      expect(result).toBe(2);
      expect(ssmMock.commandCalls(DeleteParameterCommand)).toHaveLength(2);
      expect(ssmMock.commandCalls(DeleteParameterCommand)[0].args[0].input.Name).toBe(
        '/test/param1'
      );
      expect(ssmMock.commandCalls(DeleteParameterCommand)[1].args[0].input.Name).toBe(
        '/test/param2'
      );
    });

    test('should handle delete parameter errors gracefully', async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [{ Name: '/test/param1', Value: 'value1' }]
      });
      ssmMock.on(DeleteParameterCommand).rejects(new Error('Delete failed'));

      const result = await awsManager.deleteParametersByPath('/test', 'us-east-1');

      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to delete'));
    });
  });

  describe('S3 Operations', () => {
    test('should upload JSON to S3', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await awsManager.uploadJsonToS3('test-bucket', 'test.json', { test: 'data' }, 'us-east-1');

      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.call(0).args[0].input).toEqual({
        Bucket: 'test-bucket',
        Key: 'test.json',
        Body: JSON.stringify({ test: 'data' }),
        ContentType: 'application/json'
      });
    });

    test('should download JSON from S3', async () => {
      // Mock S3 GetObjectCommand response with any to avoid TypeScript errors
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify({ test: 'data' }))
        }
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await awsManager.downloadJsonFromS3('test-bucket', 'test.json', 'us-east-1');

      expect(result).toEqual({ test: 'data' });
      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.call(0).args[0].input).toEqual({
        Bucket: 'test-bucket',
        Key: 'test.json'
      });
    });

    test('should successfully sync directory to S3', async () => {
      // Mock fs.readdir to return files (directory has files)
      jest.spyOn(fs, 'readdir').mockImplementation((path, options) => {
        if (options && options.withFileTypes) {
          return Promise.resolve([
            { name: 'index.html', isDirectory: () => false },
            { name: 'styles.css', isDirectory: () => false }
          ]);
        }
        return Promise.resolve(['index.html', 'styles.css']);
      });

      // Mock S3 PutObjectCommand
      s3Mock.on(PutObjectCommand).resolves({});

      // Run the function
      await awsManager.syncDirectoryToS3('/test-dir', 'test-bucket', 'us-east-1');

      // Verify PutObjectCommand was called for each file
      expect(s3Mock.calls().length).toBeGreaterThanOrEqual(2); // At least 2 files
    });

    test('should handle non-existent directory during sync', async () => {
      // Mock fs.access to throw an error (directory doesn't exist)
      const accessError = new Error('Directory not found');
      jest.spyOn(fs, 'access').mockRejectedValue(accessError);

      // Run the function and expect it to throw
      await expect(
        awsManager.syncDirectoryToS3('/non-existent-dir', 'test-bucket', 'us-east-1')
      ).rejects.toThrow('Local directory does not exist');
    });

    test('should handle empty directory during sync', async () => {
      // Mock fs.readdir to return empty array (empty directory)
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);

      // Run the function
      await awsManager.syncDirectoryToS3('/empty-dir', 'test-bucket', 'us-east-1');

      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('empty'));
    });

    test('should handle S3 upload errors', async () => {
      // Mock fs.readdir to return files
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readdir').mockImplementation((path, options) => {
        if (options && options.withFileTypes) {
          return Promise.resolve([{ name: 'index.html', isDirectory: () => false }]);
        }
        return Promise.resolve(['index.html']);
      });

      // Mock S3 PutObjectCommand to throw an error
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));

      // Run the function and expect it to throw
      await expect(
        awsManager.syncDirectoryToS3('/test-dir', 'test-bucket', 'us-east-1')
      ).rejects.toThrow('Failed to sync directory to S3');
    });
  });

  describe('DynamoDB Operations', () => {
    test('should populate DynamoDB', async () => {
      dynamoDBDocMock.on(BatchWriteCommand).resolves({});

      const data = {
        developers: [{ id: 'dev1', name: 'Test Dev' }],
        projects: [{ id: 'proj1', title: 'Test Project' }]
      };

      await awsManager.populateDynamoDB('dev', data, 'us-east-1');

      expect(dynamoDBDocMock.calls()).toHaveLength(2);
    });
  });

  describe('CloudFormation Operations', () => {
    test('should get stack output', async () => {
      cloudFormationMock.on(DescribeStacksCommand).resolves({
        Stacks: [
          {
            StackName: 'test-stack',
            CreationTime: new Date(),
            StackStatus: 'CREATE_COMPLETE',
            Outputs: [{ OutputKey: 'TestOutput', OutputValue: 'test-value' }]
          }
        ]
      });

      const result = await awsManager.getStackOutput('test-stack', 'TestOutput', 'us-east-1');

      expect(result).toBe('test-value');
    });

    test('should get stack outputs', async () => {
      cloudFormationMock.on(DescribeStacksCommand).resolves({
        Stacks: [
          {
            StackName: 'test-stack',
            CreationTime: new Date(),
            StackStatus: 'CREATE_COMPLETE',
            Outputs: [
              { OutputKey: 'Output1', OutputValue: 'value1' },
              { OutputKey: 'Output2', OutputValue: 'value2' }
            ]
          }
        ]
      });

      const result = await awsManager.getStackOutputs('test-stack', 'us-east-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ OutputKey: 'Output1', OutputValue: 'value1' });
      expect(result[1]).toEqual({ OutputKey: 'Output2', OutputValue: 'value2' });
    });

    test('should handle stack outputs errors', async () => {
      cloudFormationMock.on(DescribeStacksCommand).rejects(new Error('Stack not found'));

      const result = await awsManager.getStackOutputs('test-stack', 'us-east-1');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error getting stack outputs')
      );
    });
  });

  describe('CloudFront Operations', () => {
    test('should invalidate distribution', async () => {
      cloudFrontMock.on(CreateInvalidationCommand).resolves({});

      await awsManager.invalidateDistribution('test-distribution');

      expect(cloudFrontMock.calls()).toHaveLength(1);
    });
  });
});
