// CommonJS wrapper for testing
// Mock handler for testing
const mockHandler = async (event) => {
  const eventType = event.Records[0].cf.config.eventType;
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;

  // Skip static assets
  if (
    request.uri.startsWith('/_next/') ||
    request.uri.includes('.js') ||
    request.uri.includes('.css') ||
    request.uri.includes('.png') ||
    request.uri.includes('.ico')
  ) {
    return eventType === 'viewer-request' ? request : response;
  }

  if (eventType === 'viewer-request') {
    return request;
  } else if (eventType === 'viewer-response') {
    return response || { headers: {} };
  }

  return eventType === 'viewer-request' ? request : response;
};

module.exports = { handler: mockHandler };
