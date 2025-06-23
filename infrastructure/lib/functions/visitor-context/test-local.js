// Test script to verify the Lambda function locally
import { handler } from './index.mjs';

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
          querystring: 'visitor=7fc1e9cb-a4ed-42bb-b039-dbd0e5e4cc15',
          uri: '/index.html'
        }
      }
    }
  ]
};

// Mock CloudFront viewer-response event
const mockViewerResponseEvent = {
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd1ul10m7suvoxi.cloudfront.net',
          distributionId: 'E9T7A7WGATZQF',
          eventType: 'viewer-response',
          requestId: 'test-request-id'
        },
        request: {
          clientIp: '203.0.113.178',
          headers: {
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
            'x-link-id': [
              {
                key: 'X-Link-Id',
                value: '7fc1e9cb-a4ed-42bb-b039-dbd0e5e4cc15'
              }
            ]
          },
          method: 'GET',
          querystring: 'visitor=7fc1e9cb-a4ed-42bb-b039-dbd0e5e4cc15',
          uri: '/index.html'
        },
        response: {
          status: '200',
          statusDescription: 'OK',
          headers: {
            'content-type': [
              {
                key: 'Content-Type',
                value: 'text/html'
              }
            ]
          }
        }
      }
    }
  ]
};

// Run the test
async function runTest() {
  console.log('Testing Lambda@Edge function locally...');

  // Test viewer-request
  console.log('\n=== Testing viewer-request ===');
  console.log('Mock event:', JSON.stringify(mockViewerRequestEvent, null, 2));

  try {
    const requestResult = await handler(mockViewerRequestEvent);
    console.log('Request result:', JSON.stringify(requestResult, null, 2));

    // Test viewer-response
    console.log('\n=== Testing viewer-response ===');
    const responseResult = await handler(mockViewerResponseEvent);
    console.log('Response result:', JSON.stringify(responseResult, null, 2));

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
