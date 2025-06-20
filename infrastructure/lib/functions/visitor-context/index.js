exports.handler = async (event) => {
  console.log('Lambda@Edge function started');

  const { request, response } = event.Records[0].cf;
  const eventType = event.Records[0].cf.config.eventType;

  console.log(`Processing event type: ${eventType}`);

  // Skip static assets
  if (
    request.uri.startsWith('/_next/') ||
    request.uri.includes('.js') ||
    request.uri.includes('.css')
  ) {
    console.log('Skipping static asset request');
    return eventType === 'viewer-request' ? request : response;
  }

  // Handle viewer-request
  if (eventType === 'viewer-request') {
    console.log('Processing viewer-request');
    const params = new URLSearchParams(request.querystring);
    const visitorHash = params.get('visitor');

    console.log(`Visitor hash in request: ${visitorHash}`);

    if (visitorHash === 'test123') {
      if (!request.headers) {
        request.headers = {};
      }
      request.headers['x-visitor-hash'] = [
        {
          key: 'X-Visitor-Hash',
          value: visitorHash
        }
      ];
      console.log('Added visitor hash to request headers');
    }

    return request;
  }

  // Handle viewer-response
  if (eventType === 'viewer-response') {
    console.log('Processing viewer-response');

    const visitorHash = request.headers['x-visitor-hash']?.[0]?.value;
    console.log(`Visitor hash in response: ${visitorHash}`);

    if (visitorHash === 'test123') {
      console.log('Setting visitor cookies');
      response.headers['set-cookie'] = [
        {
          key: 'Set-Cookie',
          value: 'visitor_company=Test%20Company; Path=/; Secure; SameSite=None'
        },
        {
          key: 'Set-Cookie',
          value: 'visitor_name=John%20Doe; Path=/; Secure; SameSite=None'
        },
        {
          key: 'Set-Cookie',
          value: 'visitor_context=engineering; Path=/; Secure; SameSite=None'
        }
      ];
      console.log('Cookies set in response');
    }

    return response;
  }

  return eventType === 'viewer-request' ? request : response;
};
