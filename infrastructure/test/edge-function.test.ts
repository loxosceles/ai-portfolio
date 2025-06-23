const { handler } = require('../lib/functions/visitor-context-test/index.js');

describe('Lambda@Edge Function', () => {
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
      const event = createViewerRequestEvent();
      event.Records[0].cf.request.uri = '/_next/static/chunks/main.js';

      const result = await handler(event);
      expect(result).toBe(event.Records[0].cf.request);
    });

    test('should skip processing for .js files', async () => {
      const event = createViewerRequestEvent();
      event.Records[0].cf.request.uri = '/script.js';

      const result = await handler(event);
      expect(result).toBe(event.Records[0].cf.request);
    });

    test('should skip processing for .css files', async () => {
      const event = createViewerRequestEvent();
      event.Records[0].cf.request.uri = '/styles.css';

      const result = await handler(event);
      expect(result).toBe(event.Records[0].cf.request);
    });
  });

  describe('Event Type Handling', () => {
    test('should handle viewer-request events', async () => {
      const event = createViewerRequestEvent();
      const result = await handler(event);

      // Should return the request object
      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('headers');
    });

    test('should handle viewer-response events', async () => {
      const event = createViewerResponseEvent();
      const result = await handler(event);

      // Should return the response object
      expect(result).toHaveProperty('headers');
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

      const result = await handler(malformedEvent);
      expect(result).toBeDefined();
    });
  });
});
