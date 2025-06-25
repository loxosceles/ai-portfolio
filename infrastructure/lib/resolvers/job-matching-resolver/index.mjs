import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Default response object
const createDefaultResponse = (linkId = 'unknown') => ({
  linkId,
  companyName: null,
  recruiterName: null,
  context: null,
  greeting: null,
  message: null,
  skills: null
});

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    let linkId;
    
    // Check if this is a direct linkId query
    if (event.arguments && event.arguments.linkId) {
      // Direct query with linkId parameter
      linkId = event.arguments.linkId;
      console.log('Using provided linkId from arguments:', linkId);
    } else {
      // Extract linkId from JWT claims (AppSync context)
      const claims = event.requestContext?.identity?.claims || event.identity?.claims;
      // Safely extract linkId with defensive checks
      linkId = claims?.['custom:linkId'] || claims?.sub;
      
      // Only try to split if email/username exists and is a string
      if (!linkId && typeof claims?.email === 'string') {
        linkId = claims.email.split('@')[0];
      }
      
      if (!linkId && typeof claims?.username === 'string') {
        linkId = claims.username.split('@')[0];
      }

      console.log('Claims:', claims);
      console.log('Extracted linkId from claims:', linkId);
    }

    if (!linkId) {
      console.log('No linkId found');
      return createDefaultResponse();
    }

    // Get matching data from DynamoDB
    const tableName = process.env.MATCHING_TABLE_NAME;
    const result = await getMatchingData(tableName, linkId);

    // Return the result or a default response with the linkId
    return result || createDefaultResponse(linkId);
  } catch (error) {
    console.error('Error:', error);
    return createDefaultResponse('error');
  }
};

async function getMatchingData(tableName, linkId) {
  try {
    // Try with the extracted linkId
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
