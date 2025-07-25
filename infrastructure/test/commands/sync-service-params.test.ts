import { handleSyncServiceParameters } from '../../lib/cli/commands/sync-service-params';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  SSMClient,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand
} from '@aws-sdk/client-ssm';

// Mock the configs
jest.mock('../../configs/aws-config', () => ({
  awsManagerConfig: {
    projectRoot: '/test',
    supportedStages: ['test'],
    validRegions: ['eu-central-1', 'us-east-1'],
    serviceRegions: {
      api: 'eu-central-1',
      shared: 'eu-central-1',
      web: 'us-east-1'
    },
    stackPrefixes: {
      api: 'PortfolioApiStack',
      shared: 'PortfolioSharedStack',
      web: 'PortfolioWebStack'
    },
    parameterSchema: {
      test: {
        'eu-central-1': ['PARAM1'],
        'us-east-1': ['PARAM2']
      }
    }
  },
  STACK_TYPES: ['api', 'shared', 'web'],
  STACK_PREFIXES: {
    api: 'PortfolioApiStack',
    shared: 'PortfolioSharedStack',
    web: 'PortfolioWebStack'
  },
  STACK_REGIONS: {
    api: 'eu-central-1',
    shared: 'eu-central-1',
    web: 'us-east-1'
  },
  PARAMETER_SCHEMA: {
    test: {
      'eu-central-1': ['PARAM1'],
      'us-east-1': ['PARAM2']
    }
  }
}));

jest.mock('../../configs/env-config', () => ({
  SERVICE_CONFIGS: {
    frontend: {
      requiredParams: ['APPSYNC_API_KEY', 'APPSYNC_URL', 'COGNITO_CLIENT_ID']
    },
    'link-generator': {
      requiredParams: ['VISITOR_TABLE_NAME', 'CLOUDFRONT_DOMAIN']
    }
  }
}));

jest.mock('../../utils/generic', () => ({
  pascalToScreamingSnake: (str: string) => {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '');
  }
}));

// Mock the base config
jest.mock('../../configs/base', () => ({
  projectRoot: '/test',
  SUPPORTED_STAGES: ['test'],
  SSM_PARAMETER_PREFIX: 'portfolio'
}));

const cfMock = mockClient(CloudFormationClient);
const ssmMock = mockClient(SSMClient);

// Mock environment
process.env.ENVIRONMENT = 'test';
process.env.AWS_DEFAULT_REGION = 'eu-central-1';

describe('Sync Service Parameters Command Tests', () => {
  beforeEach(() => {
    cfMock.reset();
    ssmMock.reset();

    // Mock stack outputs
    cfMock.on(DescribeStacksCommand, { StackName: 'PortfolioApiStack-test' }).resolves({
      Stacks: [
        {
          StackName: 'PortfolioApiStack-test',
          CreationTime: new Date(),
          StackStatus: 'CREATE_COMPLETE',
          Outputs: [
            { OutputKey: 'AppsyncApiKey', OutputValue: 'test-api-key' },
            { OutputKey: 'AppsyncUrl', OutputValue: 'https://test-api.com' }
          ]
        }
      ]
    });

    cfMock.on(DescribeStacksCommand, { StackName: 'PortfolioSharedStack-test' }).resolves({
      Stacks: [
        {
          StackName: 'PortfolioSharedStack-test',
          CreationTime: new Date(),
          StackStatus: 'CREATE_COMPLETE',
          Outputs: [{ OutputKey: 'CognitoClientId', OutputValue: 'test-client-id' }]
        }
      ]
    });

    cfMock.on(DescribeStacksCommand, { StackName: 'PortfolioWebStack-test' }).resolves({
      Stacks: [
        {
          StackName: 'PortfolioWebStack-test',
          CreationTime: new Date(),
          StackStatus: 'CREATE_COMPLETE',
          Outputs: [
            { OutputKey: 'VisitorTableName', OutputValue: 'test-visitor-table' },
            { OutputKey: 'CloudfrontDomain', OutputValue: 'test.cloudfront.net' }
          ]
        }
      ]
    });

    // Mock SSM operations
    ssmMock.on(PutParameterCommand).resolves({});
    ssmMock.on(DeleteParameterCommand).resolves({});
  });

  test('should sync only required service parameters', async () => {
    const result = await handleSyncServiceParameters({
      verbose: false,
      dryRun: false,
      cleanup: false
    });

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(5); // All 5 required parameters

    // Verify correct parameters were synced
    const putCalls = ssmMock.commandCalls(PutParameterCommand);
    expect(putCalls.length).toBe(5);

    const syncedParams = putCalls.map((call) => call.args[0].input.Name);
    expect(syncedParams).toContain('/portfolio/test/APPSYNC_API_KEY');
    expect(syncedParams).toContain('/portfolio/test/APPSYNC_URL');
    expect(syncedParams).toContain('/portfolio/test/COGNITO_CLIENT_ID');
    expect(syncedParams).toContain('/portfolio/test/VISITOR_TABLE_NAME');
    expect(syncedParams).toContain('/portfolio/test/CLOUDFRONT_DOMAIN');
  });

  test('should delete obsolete service parameters when cleanup is enabled', async () => {
    // Mock existing service parameters (including obsolete ones) for both regions
    ssmMock.on(GetParametersByPathCommand).resolves({
      Parameters: [
        { Name: '/portfolio/test/APPSYNC_API_KEY', Value: 'old-key' },
        { Name: '/portfolio/test/OBSOLETE_PARAM', Value: 'obsolete-value' },
        { Name: '/portfolio/test/OLD_UNUSED_PARAM', Value: 'old-value' },
        { Name: '/portfolio/test/stack/STACK_PARAM', Value: 'stack-value' } // Should be ignored
      ]
    });

    const result = await handleSyncServiceParameters({
      verbose: false,
      dryRun: false,
      cleanup: true
    });

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(5);
    expect(result.deletedCount).toBe(4); // 2 obsolete parameters × 2 regions = 4 deletions

    // Verify obsolete parameters were deleted
    const deleteCalls = ssmMock.commandCalls(DeleteParameterCommand);
    expect(deleteCalls.length).toBe(4);

    const deletedParams = deleteCalls.map((call) => call.args[0].input.Name);
    expect(deletedParams.filter((p) => p === '/portfolio/test/OBSOLETE_PARAM')).toHaveLength(2);
    expect(deletedParams.filter((p) => p === '/portfolio/test/OLD_UNUSED_PARAM')).toHaveLength(2);

    // Verify stack parameters were not deleted
    expect(deletedParams).not.toContain('/portfolio/test/stack/STACK_PARAM');
  });

  test('should handle dry-run mode correctly', async () => {
    ssmMock.on(GetParametersByPathCommand).resolves({
      Parameters: [{ Name: '/portfolio/test/OBSOLETE_PARAM', Value: 'obsolete-value' }]
    });

    const result = await handleSyncServiceParameters({
      verbose: false,
      dryRun: true,
      cleanup: true
    });

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(5);
    expect(result.deletedCount).toBe(2); // 1 obsolete parameter × 2 regions = 2 deletions

    // Verify no actual AWS calls were made
    const putCalls = ssmMock.commandCalls(PutParameterCommand);
    const deleteCalls = ssmMock.commandCalls(DeleteParameterCommand);
    expect(putCalls.length).toBe(0);
    expect(deleteCalls.length).toBe(0);
  });

  test('should error if required parameters are missing from stack outputs', async () => {
    // Mock incomplete stack outputs (missing some required parameters)
    cfMock.on(DescribeStacksCommand, { StackName: 'PortfolioWebStack-test' }).resolves({
      Stacks: [
        {
          StackName: 'PortfolioWebStack-test',
          CreationTime: new Date(),
          StackStatus: 'CREATE_COMPLETE',
          Outputs: [] // Missing required web stack outputs
        }
      ]
    });

    const result = await handleSyncServiceParameters({
      verbose: false,
      dryRun: false,
      cleanup: false
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing required parameters from stack outputs');
    expect(result.message).toContain('VISITOR_TABLE_NAME');
    expect(result.message).toContain('CLOUDFRONT_DOMAIN');
  });

  test('should process multiple regions correctly', async () => {
    const result = await handleSyncServiceParameters({
      verbose: true,
      dryRun: false,
      cleanup: false
    });

    expect(result.success).toBe(true);

    // Verify stacks from both regions were processed
    const cfCalls = cfMock.commandCalls(DescribeStacksCommand);
    const stackNames = cfCalls.map((call) => call.args[0].input.StackName);

    expect(stackNames).toContain('PortfolioApiStack-test'); // eu-central-1
    expect(stackNames).toContain('PortfolioSharedStack-test'); // eu-central-1
    expect(stackNames).toContain('PortfolioWebStack-test'); // us-east-1
  });
});
