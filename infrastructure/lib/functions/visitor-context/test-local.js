// Test script to verify the Lambda function locally
const { handler } = require('./index');

// Mock CloudFront viewer-request event
const mockViewerRequestEvent = {
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd1ul10m7suvoxi.cloudfront.net',
          distributionId: 'E9T7A7WGATZQF',
          eventType: 'viewer-request',
          requestId: 'test-request-id'
        },
        request: {
          clientIp: '203.0.113.178',
          headers: {
            host: [
              {
                key: 'Host',
                value: 'd1ul10m7suvoxi.cloudfront.net'
              }
            ],
            'user-agent': [
              {
                key: 'User-Agent',
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
              }
            ]
          },
          method: 'GET',
          querystring: 'visitor=test123',
          uri: '/index.html'
        }
      }
    }
  ]
};

// Run the test
async function runTest() {
  console.log('Testing Lambda@Edge function locally...');
  console.log('Mock event:', JSON.stringify(mockViewerRequestEvent, null, 2));

  try {
    const result = await handler(mockViewerRequestEvent);
    console.log('Function result:', JSON.stringify(result, null, 2));
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
