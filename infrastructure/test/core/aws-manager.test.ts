import { AWSManager } from '../../lib/core/aws-manager';
import { awsManagerConfig } from '../../configs/aws-config';
import { mockClient } from 'aws-sdk-client-mock';
import { SSMClient, GetParametersByPathCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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
  writeFile: jest.fn().mockResolvedValue(undefined)
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

  beforeEach(() => {
    // Suppress console.error output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    ssmMock.reset();
    s3Mock.reset();
    dynamoDBMock.reset();
    dynamoDBDocMock.reset();
    cloudFormationMock.reset();
    cloudFrontMock.reset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify({ test: 'data' }))
        }
      });

      const result = await awsManager.downloadJsonFromS3('test-bucket', 'test.json', 'us-east-1');

      expect(result).toEqual({ test: 'data' });
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
            Outputs: [{ OutputKey: 'TestOutput', OutputValue: 'test-value' }]
          }
        ]
      });

      const result = await awsManager.getStackOutput('test-stack', 'TestOutput', 'us-east-1');

      expect(result).toBe('test-value');
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
