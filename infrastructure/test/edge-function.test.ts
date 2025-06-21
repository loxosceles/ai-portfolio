describe('Lambda@Edge Function', () => {
  const handler = require('../lib/functions/visitor-context/index').handler;

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
  const createViewerResponseEvent = (requestHeaders = {}) => ({
    Records: [
      {
        cf: {
          config: {
            eventType: 'viewer-response'
          },
          request: {
            uri: '/test-page', // Add this line
            headers: requestHeaders
          },
          response: {
            headers: {}
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

  describe('Viewer Request Processing', () => {
    test('should add visitor hash header when valid hash provided', async () => {
      const event = createViewerRequestEvent('visitor=test123');

      const result = await handler(event);

      expect(result.headers['x-visitor-hash']).toBeDefined();
      expect(result.headers['x-visitor-hash'][0].value).toBe('test123');
    });

    test('should not add visitor hash header for invalid hash', async () => {
      const event = createViewerRequestEvent('visitor=invalid');

      const result = await handler(event);

      expect(result.headers?.['x-visitor-hash']).toBeUndefined();
    });
  });

  describe('Viewer Response Processing', () => {
    test('should set cookies when valid visitor hash present', async () => {
      const event = createViewerResponseEvent({
        'x-visitor-hash': [
          {
            key: 'X-Visitor-Hash',
            value: 'test123'
          }
        ]
      });

      const result = await handler(event);

      expect(result.headers['set-cookie']).toBeDefined();
      expect(result.headers['set-cookie']).toHaveLength(3);
      expect(result.headers['set-cookie'][0].value).toContain('visitor_company=Test%20Company');
      expect(result.headers['set-cookie'][1].value).toContain('visitor_name=John%20Doe');
      expect(result.headers['set-cookie'][2].value).toContain('visitor_context=engineering');
    });

    test('should not set cookies when visitor hash is invalid', async () => {
      const event = createViewerResponseEvent({
        'x-visitor-hash': [
          {
            key: 'X-Visitor-Hash',
            value: 'invalid'
          }
        ]
      });

      const result = await handler(event);

      expect(result.headers['set-cookie']).toBeUndefined();
    });

    test('should not set cookies when no visitor hash present', async () => {
      const event = createViewerResponseEvent();

      const result = await handler(event);

      expect(result.headers['set-cookie']).toBeUndefined();
    });
  });
});
