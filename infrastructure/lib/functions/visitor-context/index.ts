import { DynamoDB } from 'aws-sdk';

const dynamoDB = new DynamoDB.DocumentClient({
  region: 'us-east-1' // Required for Lambda@Edge
});

export const handler = async (event: any) => {
  const request = event.Records[0].cf.request;

  try {
    const params = new URLSearchParams(request.querystring);
    const visitorHash = params.get('visitor');

    if (!visitorHash) {
      return request;
    }

    const result = await dynamoDB
      .get({
        TableName: 'PortfolioVisitorContext',
        Key: {
          visitorHash: visitorHash
        }
      })
      .promise();

    if (!result.Item) {
      return request;
    }

    request.headers['x-visitor-company'] = [
      {
        key: 'X-Visitor-Company',
        value: result.Item.companyName
      }
    ];
    request.headers['x-visitor-name'] = [
      {
        key: 'X-Visitor-Name',
        value: result.Item.contactName
      }
    ];
    request.headers['x-visitor-context'] = [
      {
        key: 'X-Visitor-Context',
        value: result.Item.greetingContext
      }
    ];

    return request;
  } catch (error) {
    console.error('Error processing request:', error);
    return request;
  }
};
