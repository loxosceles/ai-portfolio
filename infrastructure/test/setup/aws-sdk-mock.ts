import { mockClient } from 'aws-sdk-client-mock';
import { SSMClient, GetParametersByPathCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Create mock clients
export const ssmMock = mockClient(SSMClient);
export const s3Mock = mockClient(S3Client);

// Reset all mocks before each test
beforeEach(() => {
  ssmMock.reset();
  s3Mock.reset();

  // Setup default mock responses
  ssmMock.on(GetParametersByPathCommand).resolves({
    Parameters: [
      { Name: '/portfolio/dev/stack/API_KEY', Value: 'test-api-key' },
      { Name: '/portfolio/dev/stack/API_URL', Value: 'https://test-api.com' }
    ]
  });

  ssmMock.on(PutParameterCommand).resolves({
    Version: 1,
    Tier: 'Standard'
  });

  s3Mock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: () => Promise.resolve('{"test":"data"}'),
      // Add required Blob properties to satisfy TypeScript
      size: 0,
      type: '',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      slice: () => new Blob(),
      stream: () => new ReadableStream(),
      text: () => Promise.resolve('')
    } as any
  });

  s3Mock.on(PutObjectCommand).resolves({});
});
