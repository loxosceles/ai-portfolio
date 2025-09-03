// tests/visitor-context.test.mjs

import { handler, isStaticAsset } from '../../lib/functions/visitor-context/dev/index.mjs';
import { mockClient } from 'aws-sdk-client-mock';
import {
  SSMClient,
  GetParametersCommand
} from '@aws-sdk/client-ssm';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand
} from '@aws-sdk/lib-dynamodb';

// Import jest explicitly for ESM
import { jest } from '@jest/globals';

// Mock AWS SDK clients - single SSM mock handles both regions
const ssmMock = mockClient(SSMClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);
const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocMock = mockClient(DynamoDBDocumentClient);

describe('Lambda@Edge Function', () => {
  describe('isStaticAsset Function', () => {
    test('should identify _next assets', () => {
      expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true);
      expect(isStaticAsset('/_next/image')).toBe(true);
      expect(isStaticAsset('/_next/static/css/app.css')).toBe(true);
    });

    test('should identify static file extensions', () => {
      expect(isStaticAsset('/script.js')).toBe(true);
      expect(isStaticAsset('/styles.css')).toBe(true);
      expect(isStaticAsset('/icon.png')).toBe(true);
      expect(isStaticAsset('/favicon.ico')).toBe(true);
      expect(isStaticAsset('/logo.svg')).toBe(true);
      expect(isStaticAsset('/font.woff')).toBe(true);
      expect(isStaticAsset('/font.woff2')).toBe(true);
    });

    test('should not identify regular pages as static', () => {
      expect(isStaticAsset('/about')).toBe(false);
      expect(isStaticAsset('/contact.html')).toBe(false);
      expect(isStaticAsset('/')).toBe(false);
      expect(isStaticAsset('/file.txt')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
    // Reset all mocks before each test
    ssmMock.reset();
    cognitoMock.reset();
    dynamoDBMock.reset();
    dynamoDBDocMock.reset();
    
    // Setup conditional SSM mock - handles dual-region calls
    // The Lambda function makes 2 parallel SSM calls to different regions:
    // 1. Main region (eu-central-1): COGNITO_CLIENT_ID, COGNITO_USER_POOL_ID
    // 2. Edge region (us-east-1): VISITOR_TABLE_NAME
    // This mock responds differently based on input parameters
    ssmMock.on(GetParametersCommand).callsFake((input) => {
      if (input.Names.includes('/portfolio/dev/COGNITO_CLIENT_ID')) {
        // Main region response
        return {
          Parameters: [
            { Name: '/portfolio/dev/COGNITO_CLIENT_ID', Value: 'test-client-id' },
            { Name: '/portfolio/dev/COGNITO_USER_POOL_ID', Value: 'test-user-pool-id' }
          ]
        };
      } else if (input.Names.includes('/portfolio/dev/VISITOR_TABLE_NAME')) {
        // Edge region response  
        return {
          Parameters: [
            { Name: '/portfolio/dev/VISITOR_TABLE_NAME', Value: 'test-visitor-table' }
          ]
        };
      }
    });

    cognitoMock.on(AdminInitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: 'test-id-token',
        AccessToken: 'test-access-token',
        ExpiresIn: 3600
      }
    });

    dynamoDBDocMock.on(GetCommand).resolves({
      Item: {
        linkId: 'test-link-id',
        password: 'test-password'
      }
    });
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  // Helper function to create viewer-request event
  const createViewerRequestEvent = (querystring = '', headers = {}) => ({
    Records: [
      {
        cf: {
          config: {
            eventType: 'viewer-request'
          },
          request: {
            uri: '/some-page',
            querystring,
            headers
          }
        }
      }
    ]
  });

  // Helper function to create viewer-response event
  const createViewerResponseEvent = (requestHeaders = {}, responseHeaders = {}) => ({
    Records: [
      {
        cf: {
          config: {
            eventType: 'viewer-response'
          },
          request: {
            uri: '/test-page',
            querystring: '',
            headers: requestHeaders
          },
          response: {
            headers: responseHeaders
          }
        }
      }
    ]
  });

    describe('Static Asset Handling', () => {
    test('should skip processing for _next assets', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      event.Records[0].cf.request.uri = '/_next/static/chunks/main.js';

      const result = await handler(event);
      expect(result.uri).toBe('/_next/static/chunks/main.js');
      
      // Verify AWS clients were NOT called for static assets
      expect(ssmMock.calls()).toHaveLength(0);
    });

    test('should skip processing for .js files', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      event.Records[0].cf.request.uri = '/script.js';

      const result = await handler(event);
      expect(result.uri).toBe('/script.js');
    });

    test('should skip processing for .css files', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      event.Records[0].cf.request.uri = '/styles.css';

      const result = await handler(event);
      expect(result.uri).toBe('/styles.css');
    });
  });

    describe('Event Type Handling', () => {
    test('should handle viewer-request events with visitor parameter', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      const result = await handler(event);

      // Should add auth tokens to headers
      expect(result.headers['x-auth-tokens']).toBeDefined();
      expect(result.headers['x-link-id']).toBeDefined();
      
      // Verify SSM was called twice (both regions)
      expect(ssmMock.calls()).toHaveLength(2);
      expect(dynamoDBDocMock.calls()).toHaveLength(1);
      expect(cognitoMock.calls()).toHaveLength(1);
    });

    test('should handle viewer-request events without visitor parameter', async () => {
      const event = createViewerRequestEvent();
      const result = await handler(event);

      // Should not add auth tokens to headers
      expect(result.headers?.['x-auth-tokens']).toBeUndefined();
      expect(result.headers?.['x-link-id']).toBeUndefined();
      
      // Verify AWS clients were NOT called
      expect(ssmMock.calls()).toHaveLength(0);
    });

    test('should handle viewer-response events with auth tokens', async () => {
      const event = createViewerResponseEvent(
        {
          'x-auth-tokens': [
            {
              key: 'X-Auth-Tokens',
              value: JSON.stringify({
                IdToken: 'test-id-token',
                AccessToken: 'test-access-token',
                ExpiresIn: 3600
              })
            }
          ],
          'x-link-id': [{ 
            key: 'X-Link-Id', 
            value: 'test-link-id' 
          }]
        },
        {}
      );
      const result = await handler(event);

      // Should add cookies to response
      expect(result.headers['set-cookie']).toBeDefined();
      expect(result.headers['set-cookie'].length).toBeGreaterThan(0);
    });

    test('should handle viewer-response events without auth tokens', async () => {
      const event = createViewerResponseEvent({}, {});
      const result = await handler(event);

      // Should not modify the response
      expect(result.headers['set-cookie']).toBeUndefined();
    });
  });

    describe('Error Handling', () => {
    test('should handle SSM parameter errors gracefully', async () => {
      // Mock SSM to reject
      ssmMock.on(GetParametersCommand).rejects(new Error('SSM error'));
      
      const event = createViewerRequestEvent('visitor=test-link-id');
      const result = await handler(event);
      
      // Should still return a valid response
      expect(result).toBeDefined();
      expect(result.uri).toBe('/some-page');
    });

    test('should handle DynamoDB errors gracefully', async () => {
      // Mock DynamoDB to reject
      dynamoDBDocMock.on(GetCommand).rejects(new Error('DynamoDB error'));
      
      const event = createViewerRequestEvent('visitor=test-link-id');
      const result = await handler(event);
      
      // Should still return a valid response
      expect(result).toBeDefined();
    });
  });

    describe('AWS Client Interactions', () => {
    test('should call SSM with correct parameters', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      await handler(event);
      
      // Verify SSM was called twice with correct parameters
      expect(ssmMock.calls()).toHaveLength(2);
      
      // Check both calls (order may vary due to Promise.all)
      const calls = ssmMock.calls();
      const callInputs = calls.map(call => call.firstArg.input);
      
      expect(callInputs).toContainEqual({
        Names: ['/portfolio/dev/COGNITO_CLIENT_ID', '/portfolio/dev/COGNITO_USER_POOL_ID'],
        WithDecryption: true
      });
      
      expect(callInputs).toContainEqual({
        Names: ['/portfolio/dev/VISITOR_TABLE_NAME'],
        WithDecryption: true
      });
    });

    test('should call Cognito with correct parameters', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      await handler(event);
      
      // Verify Cognito was called with correct parameters
      expect(cognitoMock.calls()[0].firstArg.input).toEqual({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: 'test-client-id',
        UserPoolId: 'test-user-pool-id',
        AuthParameters: {
          USERNAME: 'test-link-id@visitor.temporary.com',
          PASSWORD: 'test-password'
        }
      });
    });
    });
  });
});