// Version 1.1 - Environment-specific Lambda@Edge function
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);
const cognito = new CognitoIdentityProviderClient({ region: 'eu-central-1' });
const ssmMainRegion = new SSMClient({ region: 'eu-central-1' }); // For main app config
const ssmEdgeRegion = new SSMClient({ region: 'us-east-1' }); // For edge-specific config

let config = null;

async function getConfig(request) {
  if (config) return config;

  // Fetch main app config from eu-central-1
  const mainConfigCommand = new GetParametersCommand({
    Names: ['/portfolio/prod/COGNITO_CLIENT_ID', '/portfolio/prod/COGNITO_USER_POOL_ID'],
    WithDecryption: true
  });

  // Fetch edge-specific config from us-east-1
  const edgeConfigCommand = new GetParametersCommand({
    Names: ['/portfolio/prod/stack/VISITOR_TABLE_NAME'],
    WithDecryption: true
  });

  const [mainParameters, edgeParameters] = await Promise.all([
    ssmMainRegion.send(mainConfigCommand),
    ssmEdgeRegion.send(edgeConfigCommand)
  ]);

  const allParameters = [...mainParameters.Parameters, ...edgeParameters.Parameters];

  config = {
    clientId: allParameters.find((p) => p.Name.endsWith('COGNITO_CLIENT_ID')).Value,
    userPoolId: allParameters.find((p) => p.Name.endsWith('COGNITO_USER_POOL_ID')).Value,
    tableName: allParameters.find((p) => p.Name.endsWith('VISITOR_TABLE_NAME')).Value
  };

  return config;
}

async function getLinkData(tableName, linkId) {
  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        linkId
      }
    });

    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error('Error fetching link data:', error);
    return null;
  }
}

async function getCognitoToken(username, password, userPoolId, clientId) {
  try {
    const command = new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      ClientId: clientId,
      UserPoolId: userPoolId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    const response = await cognito.send(command);
    return response.AuthenticationResult;
  } catch (error) {
    console.error('Cognito authentication error:', error);
    return null;
  }
}

async function handleViewerRequest(request) {
  const params = new URLSearchParams(request.querystring);
  const linkId = params.get('visitor');

  if (!linkId) {
    return request;
  }

  // Skip static assets
  if (
    request.uri.startsWith('/_next/') ||
    request.uri.includes('.js') ||
    request.uri.includes('.css') ||
    request.uri.includes('.png') ||
    request.uri.includes('.ico')
  ) {
    return request;
  }

  try {
    const { tableName, userPoolId, clientId } = await getConfig(request);

    // Get link data from DynamoDB
    const linkData = await getLinkData(tableName, linkId);

    if (!linkData || !linkData.password) {
      console.error('No valid link data found');
      return request;
    }

    // Generate username from linkId (same format as link creator)
    const username = `${linkId}@visitor.temporary.com`;

    // Get Cognito tokens
    const tokens = await getCognitoToken(username, linkData.password, userPoolId, clientId);

    if (!tokens) {
      console.error('Failed to obtain Cognito tokens');
      return request;
    }

    // Add tokens and link ID to headers
    if (!request.headers) {
      request.headers = {};
    }

    request.headers['x-auth-tokens'] = [
      {
        key: 'X-Auth-Tokens',
        value: JSON.stringify(tokens)
      }
    ];

    request.headers['x-link-id'] = [
      {
        key: 'X-Link-Id',
        value: linkId
      }
    ];

    return request;
  } catch (error) {
    console.error('Error in viewer request handler:', error);
    return request;
  }
}

async function handleViewerResponse(request, response) {
  const authTokens = request.headers['x-auth-tokens']?.[0]?.value;

  if (!authTokens) {
    return response;
  }

  try {
    const tokens = JSON.parse(authTokens);
    const linkId = request.headers['x-link-id']?.[0]?.value;

    // Set secure cookies for auth tokens (readable by client)
    // NOTE: HttpOnly flag is intentionally omitted as the static frontend needs
    // JavaScript access to these tokens for client-side API requests.
    // Security is enhanced with SameSite=Strict and short expiration times.
    const cookies = [
      {
        key: 'Set-Cookie',
        value: `IdToken=${tokens.IdToken}; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
      },
      {
        key: 'Set-Cookie',
        value: `AccessToken=${tokens.AccessToken}; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
      }
    ];

    // Set visitor info cookies that the frontend can read
    if (linkId) {
      cookies.push(
        {
          key: 'Set-Cookie',
          value: `LinkId=${linkId}; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
        },
        {
          key: 'Set-Cookie',
          value: `visitor_company=Demo Company; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
        },
        {
          key: 'Set-Cookie',
          value: `visitor_name=Visitor; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
        },
        {
          key: 'Set-Cookie',
          value: `visitor_context=portfolio review; Path=/; Secure; SameSite=Strict; Max-Age=${tokens.ExpiresIn}`
        }
      );
    }

    response.headers['set-cookie'] = cookies;
    return response;
  } catch (error) {
    console.error('Error in viewer response handler:', error);
    return response;
  }
}

export const handler = async (event) => {
  const { request, response } = event.Records[0].cf;
  const eventType = event.Records[0].cf.config.eventType;

  try {
    if (eventType === 'viewer-request') {
      return await handleViewerRequest(request);
    } else if (eventType === 'viewer-response') {
      return await handleViewerResponse(request, response);
    }

    return eventType === 'viewer-request' ? request : response;
  } catch (error) {
    console.error('Unhandled error:', error);
    return eventType === 'viewer-request' ? request : response;
  }
};
