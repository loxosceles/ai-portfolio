// Mock AWS SDK modules
jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Parameters: [
        { Name: '/portfolio/dev/NEXT_PUBLIC_COGNITO_CLIENT_ID', Value: 'test-client-id' },
        { Name: '/portfolio/dev/NEXT_PUBLIC_COGNITO_USER_POOL_ID', Value: 'test-user-pool-id' },
        { Name: '/portfolio/dev/VISITOR_TABLE_NAME', Value: 'test-visitor-table' }
      ]
    })
  })),
  GetParametersCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      AuthenticationResult: {
        IdToken: 'test-id-token',
        AccessToken: 'test-access-token',
        ExpiresIn: 3600
      }
    })
  })),
  AdminInitiateAuthCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        Item: {
          linkId: 'test-link-id',
          password: 'test-password'
        }
      })
    }))
  },
  GetCommand: jest.fn().mockImplementation((params) => params),
  ScanCommand: jest.fn().mockImplementation((params) => params)
}));

// Use dynamic import for ES modules
let edgeFunction: any;

describe('Lambda@Edge Function', () => {
  beforeAll(async () => {
    // Dynamically import the module under test
    edgeFunction = await import('../../lib/functions/visitor-context/dev/index.mjs');
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

      const result = await edgeFunction.handler(event);
      expect(result.uri).toBe('/_next/static/chunks/main.js');
    });

    test('should skip processing for .js files', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      event.Records[0].cf.request.uri = '/script.js';

      const result = await edgeFunction.handler(event);
      expect(result.uri).toBe('/script.js');
    });

    test('should skip processing for .css files', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      event.Records[0].cf.request.uri = '/styles.css';

      const result = await edgeFunction.handler(event);
      expect(result.uri).toBe('/styles.css');
    });
  });

  describe('Event Type Handling', () => {
    test('should handle viewer-request events with visitor parameter', async () => {
      const event = createViewerRequestEvent('visitor=test-link-id');
      const result = await edgeFunction.handler(event);

      // Should add auth tokens to headers
      expect(result.headers['x-auth-tokens']).toBeDefined();
      expect(result.headers['x-link-id']).toBeDefined();
    });

    test('should handle viewer-request events without visitor parameter', async () => {
      const event = createViewerRequestEvent();
      const result = await edgeFunction.handler(event);

      // Should not add auth tokens to headers
      expect(result.headers?.['x-auth-tokens']).toBeUndefined();
      expect(result.headers?.['x-link-id']).toBeUndefined();
    });

    test('should handle viewer-response events with auth tokens', async () => {
      const event = createViewerResponseEvent(
        {
          'x-auth-tokens': [
            {
              value: JSON.stringify({
                IdToken: 'test-id-token',
                AccessToken: 'test-access-token',
                ExpiresIn: 3600
              })
            }
          ],
          'x-link-id': [{ value: 'test-link-id' }]
        },
        {}
      );
      const result = await edgeFunction.handler(event);

      // Should add cookies to response
      expect(result.headers['set-cookie']).toBeDefined();
      expect(result.headers['set-cookie'].length).toBeGreaterThan(0);
    });

    test('should handle viewer-response events without auth tokens', async () => {
      const event = createViewerResponseEvent({}, {});
      const result = await edgeFunction.handler(event);

      // Should not modify the response
      expect(result.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully and return original request/response', async () => {
      // Test with malformed event
      const malformedEvent = {
        Records: [
          {
            cf: {
              config: { eventType: 'viewer-request' },
              request: { uri: '/', querystring: '', headers: {} }
            }
          }
        ]
      };

      const result = await edgeFunction.handler(malformedEvent);
      expect(result).toBeDefined();
    });
  });
});
