import { AWSManager } from '../../lib/core/aws-manager';
import { awsManagerConfig } from '../../configs/aws-config';
import { DataItem, DataCollection } from '../../types/data';
import * as fs from 'fs/promises';
import { SSMClient, PutParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// Mock all AWS SDK clients and fs
jest.mock('fs/promises');
jest.mock('@aws-sdk/client-ssm');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock environment
process.env.ENVIRONMENT = 'dev';

describe('AWSManager', () => {
  let awsManager: AWSManager;

  const mockDevelopers = [
    { id: 'dev1', name: 'Developer 1' },
    { id: 'dev2', name: 'Developer 2' }
  ];

  const mockProjects = [
    { id: 'proj1', developerId: 'dev1', title: 'Project 1' },
    { id: 'proj2', developerId: 'dev2', title: 'Project 2' }
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    awsManager = new AWSManager(awsManagerConfig);

    // Mock fs operations
    (fs.readFile as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('developer.json')) {
        return Promise.resolve(JSON.stringify(mockDevelopers));
      } else if (path.includes('projects.json')) {
        return Promise.resolve(JSON.stringify(mockProjects));
      }
      return Promise.reject(new Error('File not found'));
    });

    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    // Mock command constructors
    (PutParameterCommand as unknown as jest.Mock).mockImplementation((params) => params);
    (GetParametersByPathCommand as unknown as jest.Mock).mockImplementation((params) => params);
    (PutObjectCommand as unknown as jest.Mock).mockImplementation((params) => params);
    (GetObjectCommand as unknown as jest.Mock).mockImplementation((params) => params);
    (BatchWriteCommand as unknown as jest.Mock).mockImplementation((params) => params);
  });

  describe('Stage and Region Management', () => {
    test('should get current stage', () => {
      expect(awsManager.getStage()).toBe('dev');
    });

    test('should get regions for current stage', () => {
      const regions = awsManager.getRegionsForStage();
      expect(regions).toEqual(['eu-central-1', 'us-east-1']);
    });

    test('should get region for service', () => {
      expect(awsManager.getRegionForService('cloudfront')).toBe('us-east-1');
      expect(awsManager.getRegionForService('api')).toBe('eu-central-1');
    });

    test('should get stack name for service', () => {
      expect(awsManager.getStackNameForService('web')).toBe('PortfolioWebStack-dev');
      expect(awsManager.getStackNameForService('api')).toBe('PortfolioApiStack-dev');
    });

    test('should validate region', () => {
      expect(awsManager.validateRegion('us-east-1')).toBe('us-east-1');
      expect(() => awsManager.validateRegion('invalid')).toThrow('Invalid region');
    });
  });

  describe('SSM Operations', () => {
    test('should put parameter', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (SSMClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      await awsManager.putParameter('test-param', 'test-value', 'us-east-1');

      expect(SSMClient).toHaveBeenCalledWith({ region: 'us-east-1' });
      expect(PutParameterCommand).toHaveBeenCalledWith({
        Name: 'test-param',
        Value: 'test-value',
        Type: 'String',
        Overwrite: true
      });
    });

    test('should get parameters by path', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [{ Name: '/portfolio/dev/stack/TEST_PARAM', Value: 'test-value' }]
      });
      (SSMClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const params = await awsManager.getParametersByPath('/portfolio/dev', 'us-east-1');

      expect(GetParametersByPathCommand).toHaveBeenCalledWith({
        Path: '/portfolio/dev',
        Recursive: true,
        WithDecryption: true
      });
      expect(params).toEqual([{ Name: '/portfolio/dev/stack/TEST_PARAM', Value: 'test-value' }]);
    });

    test('should get parameters for stage', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Parameters: [{ Name: '/portfolio/dev/stack/TEST_PARAM', Value: 'test-value' }]
      });
      (SSMClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const params = await awsManager.getParameters('dev', 'us-east-1');
      expect(params).toEqual({ TEST_PARAM: 'test-value' });
    });
  });

  describe('S3 Operations', () => {
    test('should upload JSON to S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const testData = { test: 'data' };
      await awsManager.uploadJsonToS3('test-bucket', 'test-key', testData, 'us-east-1');

      expect(S3Client).toHaveBeenCalledWith({ region: 'us-east-1' });
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key',
        Body: JSON.stringify(testData),
        ContentType: 'application/json'
      });
    });

    test('should download JSON from S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Body: {
          transformToString: jest
            .fn()
            .mockResolvedValue(JSON.stringify([{ id: 'test-id', name: 'Test' }]))
        }
      });
      (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const data = await awsManager.downloadJsonFromS3('test-bucket', 'test-key', 'us-east-1');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-key'
      });
      expect(data).toEqual([{ id: 'test-id', name: 'Test' }]);
    });
  });

  describe('Data Management Operations', () => {
    test('should load local data', async () => {
      const data = await awsManager.loadLocalData('dev');

      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('developer.json'), 'utf-8');
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('projects.json'), 'utf-8');

      expect(data).toEqual({
        developers: mockDevelopers,
        projects: mockProjects
      });
    });

    test('should upload data to S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const data: DataCollection<DataItem> = {
        developers: mockDevelopers as DataItem[],
        projects: mockProjects as DataItem[]
      };

      await awsManager.uploadDataToS3('dev', 'test-bucket', data, 'us-east-1');

      expect(PutObjectCommand).toHaveBeenCalledTimes(2);
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'dev/developer.json',
        Body: JSON.stringify(mockDevelopers),
        ContentType: 'application/json'
      });
    });

    test('should download data from S3', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Body: {
          transformToString: jest
            .fn()
            .mockResolvedValue(JSON.stringify([{ id: 'test-id', name: 'Test' }]))
        }
      });
      (S3Client as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const data = await awsManager.downloadDataFromS3('dev', 'test-bucket', 'us-east-1');

      expect(GetObjectCommand).toHaveBeenCalledTimes(2);
      expect(data).toHaveProperty('developers');
      expect(data).toHaveProperty('projects');
    });

    test('should save local data', async () => {
      const data: DataCollection<DataItem> = {
        developers: mockDevelopers as DataItem[],
        projects: mockProjects as DataItem[]
      };

      await awsManager.saveLocalData(data, '/test/output');

      expect(fs.mkdir).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('DynamoDB Operations', () => {
    test('should populate DynamoDB', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (DynamoDBClient as jest.Mock).mockImplementation(() => ({}));
      (DynamoDBDocumentClient.from as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const data: DataCollection<DataItem> = {
        developers: mockDevelopers as DataItem[],
        projects: mockProjects as DataItem[]
      };

      await awsManager.populateDynamoDB('dev', data, 'us-east-1');

      expect(DynamoDBClient).toHaveBeenCalledWith({ region: 'us-east-1' });
      expect(BatchWriteCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('Parameter Management', () => {
    test('should upload parameters', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      (SSMClient as jest.Mock).mockImplementation(() => ({ send: mockSend }));

      const params = {
        BEDROCK_MODEL_ID: 'test-model',
        CDK_DEFAULT_ACCOUNT: '123456789',
        CDK_DEFAULT_REGION: 'eu-central-1',
        GITHUB_OWNER: 'test',
        GITHUB_REPO: 'test',
        DATA_BUCKET_NAME: 'test',
        DEVELOPER_TABLE_NAME: 'test',
        PROJECTS_TABLE_NAME: 'test',
        MATCHING_TABLE_NAME: 'test',
        RECRUITER_PROFILES_TABLE_NAME: 'test'
      };
      const errorCount = await awsManager.uploadParameters('dev', params, 'eu-central-1');

      expect(errorCount).toBe(0);
      expect(PutParameterCommand).toHaveBeenCalledTimes(10);
    });

    test('should simulate upload parameters', () => {
      const params = { BEDROCK_MODEL_ID: 'test-model' };
      const errorCount = awsManager.simulateUploadParameters('dev', params, 'eu-central-1');

      expect(errorCount).toBe(9);
    });
  });
});
