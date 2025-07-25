/**
 * SSM Parameters Command Tests
 *
 * Tests the command handlers directly as the CLI binaries do
 */
import { mockClient } from 'aws-sdk-client-mock';
import {
  SSMClient,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand
} from '@aws-sdk/client-ssm';
import { handleUploadParameters, handleExportParameters } from '../../lib/cli/commands/ssm-params';

// Mock AWS SDK clients
const ssmMock = mockClient(SSMClient);

// Mock the environment manager
jest.mock('../../lib/core/env-manager', () => {
  return {
    EnvironmentManager: jest.fn().mockImplementation(() => ({
      loadEnv: jest.fn().mockReturnValue({
        BEDROCK_MODEL_ID: 'test-model',
        CDK_DEFAULT_ACCOUNT: '123456789012',
        CDK_DEFAULT_REGION: 'us-east-1',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo',
        DATA_BUCKET_NAME: 'test-bucket',
        DEVELOPER_TABLE_NAME: 'test-developers',
        PROJECTS_TABLE_NAME: 'test-projects',
        RECRUITER_PROFILES_TABLE_NAME: 'test-recruiters',
        VISITOR_TABLE_NAME: 'test-visitors',
        AWS_ADMIN_ARN: 'arn:aws:iam::123456789012:role/test-admin'
      }),
      writeEnvFile: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

describe('SSM Parameters Command Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Reset mocks
    ssmMock.reset();

    originalEnv = { ...process.env };

    // Set up environment
    process.env.ENVIRONMENT = 'test';

    // Mock SSM responses
    ssmMock.on(PutParameterCommand).resolves({
      Version: 1,
      Tier: 'Standard'
    });

    ssmMock.on(DeleteParameterCommand).resolves({});

    ssmMock.on(GetParametersByPathCommand).resolves({
      Parameters: [
        { Name: '/portfolio/test/stack/TEST_PARAM', Value: 'test-value' },
        { Name: '/portfolio/test/stack/API_KEY', Value: 'test-api-key' }
      ]
    });
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  test('should handle upload command like CLI', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: false,
      region: undefined,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('All parameters uploaded successfully');
    expect(result.errorCount).toBe(0);
    expect(ssmMock.calls().length).toBeGreaterThan(0);
  });

  test('should handle upload with dry-run option', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: true,
      region: undefined,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('All parameters uploaded successfully');
    expect(result.errorCount).toBe(0);
    // Dry run should not make actual SSM calls
    expect(ssmMock.calls().length).toBe(0);
  });

  test('should handle export command like CLI', async () => {
    const result = await handleExportParameters({
      verbose: false,
      format: 'env',
      output: false,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Parameters exported successfully');
    expect(result.errorCount).toBe(0);
    expect(result.content).toContain('TEST_PARAM=test-value');
    expect(ssmMock.calls().length).toBeGreaterThan(0);
  });

  test('should handle export with JSON format', async () => {
    const result = await handleExportParameters({
      verbose: false,
      format: 'json',
      output: false,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    expect(result.content).toContain('"TEST_PARAM"');
    expect(result.content).toContain('"test-value"');
  });

  test('should handle export with target option', async () => {
    const result = await handleExportParameters({
      verbose: false,
      format: 'env',
      target: 'infrastructure',
      output: false
    });

    expect(result.success).toBe(true);
    expect(result.content).toContain('TEST_PARAM=test-value');
  });

  test('should handle region option', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: false,
      region: 'eu-west-1',
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
  });

  test('should fail upload without target', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: false,
      region: undefined,
      target: undefined
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('target is required');
    expect(result.errorCount).toBe(1);
  });

  test('should fail export without target', async () => {
    const result = await handleExportParameters({
      verbose: false,
      format: 'env',
      output: false,
      target: undefined
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('target is required');
    expect(result.errorCount).toBe(1);
  });

  test('should cleanup parameters before upload', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: false,
      region: undefined,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    // Should have both delete and put calls
    const deleteCalls = ssmMock.commandCalls(DeleteParameterCommand);
    const putCalls = ssmMock.commandCalls(PutParameterCommand);
    expect(deleteCalls.length).toBeGreaterThan(0);
    expect(putCalls.length).toBeGreaterThan(0);
  });

  test('should only cleanup stack parameters, not service parameters', async () => {
    // Mock both stack and service parameters existing
    ssmMock.on(GetParametersByPathCommand).resolves({
      Parameters: [
        { Name: '/portfolio/test/stack/BEDROCK_MODEL_ID', Value: 'old-model' },
        { Name: '/portfolio/test/stack/CDK_DEFAULT_ACCOUNT', Value: 'old-account' },
        { Name: '/portfolio/test/APPSYNC_URL', Value: 'https://old-api.com' },
        { Name: '/portfolio/test/COGNITO_CLIENT_ID', Value: 'old-client-id' }
      ]
    });

    const result = await handleUploadParameters({
      verbose: false,
      dryRun: false,
      region: undefined,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);

    // Verify that GetParametersByPath was called with the correct stack path
    const getParametersCalls = ssmMock.commandCalls(GetParametersByPathCommand);
    expect(getParametersCalls.length).toBeGreaterThan(0);

    // Check that the path used for cleanup is only the stack path
    const cleanupCall = getParametersCalls.find(
      (call) => call.args[0].input.Path === '/portfolio/test/stack'
    );
    expect(cleanupCall).toBeDefined();

    // Verify that service parameters path is NOT called for cleanup
    const serviceCleanupCall = getParametersCalls.find(
      (call) => call.args[0].input.Path === '/portfolio/test' && call.args[0].input.Recursive
    );
    expect(serviceCleanupCall).toBeUndefined();
  });

  test('should handle dry-run mode correctly', async () => {
    const result = await handleUploadParameters({
      verbose: false,
      dryRun: true,
      region: undefined,
      target: 'infrastructure'
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('All parameters uploaded successfully');

    // Should not actually delete or upload parameters in dry-run
    const deleteCalls = ssmMock.commandCalls(DeleteParameterCommand);
    const putCalls = ssmMock.commandCalls(PutParameterCommand);
    expect(deleteCalls.length).toBe(0);
    expect(putCalls.length).toBe(0);
  });
});
