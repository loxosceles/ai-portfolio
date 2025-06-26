import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = async (event) => {
  // Log the incoming event for debugging
  // console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Extract linkId from JWT claims or query parameters
    const claims = event.requestContext?.authorizer?.claims;
    const linkId =
      claims?.['custom:linkId'] ||
      claims?.email?.split('@')[0] || // Extract from email like '296850ee-5f11-4a5f-910a-a6c2dff8f52e@visitor.temporary.com'
      claims?.username?.split('@')[0] || // Fallback to username
      event.queryStringParameters?.linkId;

    if (!linkId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Missing linkId parameter',
          debug: {
            claims: claims,
            queryParams: event.queryStringParameters
          }
        })
      };
    }

    // Get matching data from DynamoDB
    const tableName = process.env.MATCHING_TABLE_NAME;
    const result = await getMatchingData(tableName, linkId);

    if (!result) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'No matching data found' })
      };
    }

    // Return matching data
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

// Get matching data from DynamoDB
async function getMatchingData(tableName, linkId) {
  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: { linkId }
    });

    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return null;
  }
}
