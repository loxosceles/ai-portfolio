import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract linkId from JWT claims (AppSync context)
    const claims = event.requestContext?.identity?.claims || event.identity?.claims;
    // Safely extract linkId with defensive checks
    let linkId = claims?.['custom:linkId'] || claims?.sub;
    
    // Only try to split if email/username exists and is a string
    if (!linkId && typeof claims?.email === 'string') {
      linkId = claims.email.split('@')[0];
    }
    
    if (!linkId && typeof claims?.username === 'string') {
      linkId = claims.username.split('@')[0];
    }

    console.log('Claims:', claims);
    console.log('Extracted linkId:', linkId);

    if (!linkId) {
      console.log('No linkId found in claims');
      return {
        linkId: 'unknown',
        companyName: null,
        recruiterName: null,
        context: null,
        greeting: null,
        message: null,
        skills: null
      };
    }

    // Get matching data from DynamoDB
    const tableName = process.env.MATCHING_TABLE_NAME;
    const result = await getMatchingData(tableName, linkId);

    if (!result) {
      return {
        linkId,
        companyName: null,
        recruiterName: null,
        context: null,
        greeting: null,
        message: null,
        skills: null
      };
    }

    return result;
  } catch (error) {
    console.error('Error:', error);
    return {
      linkId: 'error',
      companyName: null,
      recruiterName: null,
      context: null,
      greeting: null,
      message: null,
      skills: null
    };
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
