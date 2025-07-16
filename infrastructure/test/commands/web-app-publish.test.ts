/**
 * Web App Publish Command Tests
 */
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

// Mock AWS SDK clients
const s3Mock = mockClient(S3Client);
const cloudFormationMock = mockClient(CloudFormationClient);

// Mock AWSManager
jest.mock('../../lib/core/aws-manager', () => {
  return {
    AWSManager: jest.fn().mockImplementation(() => ({
      getStage: jest.fn().mockReturnValue('test'),
      getRegionForService: jest.fn().mockReturnValue('us-east-1'),
      getStackNameForService: jest.fn().mockReturnValue('PortfolioWebStack-test'),
      logVerbose: jest.fn(),
      getStackOutput: jest.fn().mockResolvedValue('test-bucket'),
      syncDirectoryToS3: jest.fn().mockResolvedValue(undefined),
      config: { projectRoot: '/test/project/root' }
    }))
  };
});

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/test/frontend/out'),
  resolve: jest.fn().mockReturnValue('/test/project/root')
}));

describe('Web App Publish Command Tests', () => {
  test('should publish web app successfully', async () => {
    // Setup CloudFormation mock
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          Outputs: [{ OutputKey: 'WebBucketName', OutputValue: 'test-bucket' }]
        }
      ]
    });

    // Setup S3 mock
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: []
    });
    s3Mock.on(PutObjectCommand).resolves({});

    // Import the function after mocking
    const { publishWebApp } = require('../../lib/cli/commands/web-app-publish');

    // Test the function
    await expect(publishWebApp(false)).resolves.not.toThrow();
  });
});
