// Visitor Context Lambda@Edge function - Documentation: https://github.com/loxosceles/ai-portfolio/blob/main/docs/architecture/authentication.md

import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';


// We need to hard-code these regions here since the Lambda@Edge function does
// not accept any environment variables. The regions are needed in order to
// retrieve the SSM parameters for other configurations.
const DEFAULT_REGION = 'eu-central-1'; // For main app config
const DISTRIB_REGION = 'us-east-1'; // For edge-specific config

// Initialize AWS clients
const dynamodb = new DynamoDBClient({ region: DISTRIB_REGION });
const docClient = DynamoDBDocumentClient.from(dynamodb);
const cognito = new CognitoIdentityProviderClient({ region: DEFAULT_REGION });
const ssmMainRegion = new SSMClient({ region: DEFAULT_REGION }); 
const ssmEdgeRegion = new SSMClient({ region: DISTRIB_REGION });

export function isStaticAsset(uri) {
  const staticExtensions = ['.js', '.css', '.png', '.ico', '.svg', '.woff', '.woff2'];
  return (
    uri.startsWith('/_next/') ||
    staticExtensions.some((ext) => uri.endsWith(ext))
  );
}

async function getConfigsFromSSMParamStore() {
  try {
    const mainConfigCommand = new GetParametersCommand({
      Names: ['/portfolio/dev/COGNITO_CLIENT_ID', '/portfolio/dev/COGNITO_USER_POOL_ID'],
      WithDecryption: true
    });

    // Fetch edge-specific config from us-east-1
    const edgeConfigCommand = new GetParametersCommand({
      Names: ['/portfolio/dev/VISITOR_TABLE_NAME'],
      WithDecryption: true
    });

    const [mainParameters, edgeParameters] = await Promise.all([
      ssmMainRegion.send(mainConfigCommand),
      ssmEdgeRegion.send(edgeConfigCommand)
    ]);

    const allParameters = [...mainParameters.Parameters, ...edgeParameters.Parameters];

    // Parameter extraction
    const clientIdParam = allParameters.find((p) => p.Name.endsWith('COGNITO_CLIENT_ID'));
    const userPoolIdParam = allParameters.find((p) => p.Name.endsWith('COGNITO_USER_POOL_ID'));
    const tableNameParam = allParameters.find((p) => p.Name.endsWith('VISITOR_TABLE_NAME'));

    if (!clientIdParam || !userPoolIdParam || !tableNameParam) {
      throw new Error(
        `Missing required parameters: clientId=${!!clientIdParam}, userPoolId=${!!userPoolIdParam}, tableName=${!!tableNameParam}`
      );
    }

    const config = {
      clientId: clientIdParam.Value,
      userPoolId: userPoolIdParam.Value,
      tableName: tableNameParam.Value
    };

    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    throw new Error(`Failed to load SSM configuration: ${error.message}`);
  }
}

async function getLinkDataFromDDB(tableName, linkId) {
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
    throw new Error(`Failed to fetch link data for ${linkId}: ${error.message}`);
  }
}

async function requestCognitoTokenWithUserCredentials(username, password, userPoolId, clientId) {
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
    throw new Error(`Failed to authenticate user ${username}: ${error.message}`);
  }
}

async function attachAuthHeaders(request, linkData, tokens, linkId) {
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
}

async function attachAuthCookies(request, response) {
  const authTokens = request.headers['x-auth-tokens']?.[0]?.value;

  if (!authTokens) {
    return response;
  }

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
}

export const handler = async (event) => {
  const { request, response } = event.Records[0].cf;
  const eventType = event.Records[0].cf.config.eventType;

  try {
    if (eventType === 'viewer-request') {
      // Skip static assets early - before any AWS calls
      if (isStaticAsset(request.uri)) {
        return request;
      }

      // Intercept viewer requests
      const params = new URLSearchParams(request.querystring);
      const linkId = params.get('visitor');

      // Exit early if no linkId is present
      if (!linkId) {
        return request;
      }

      const { tableName, userPoolId, clientId } = await getConfigsFromSSMParamStore();
      const linkData = await getLinkDataFromDDB(tableName, linkId);

      // If the linkData is not found in the database, return the unmodified request
      if (!linkData) {
        console.error('No link data found for linkId:', linkId);
        return request;
      }

      if (!linkData.password) {
        console.error('No valid link data found - missing password');
        return request;
      }

      const username = `${linkId}@visitor.temporary.com`;
      const tokens = await requestCognitoTokenWithUserCredentials(
        username,
        linkData.password,
        userPoolId,
        clientId
      );

      const requestWithHeaders = await attachAuthHeaders(request, linkData, tokens, linkId);
      return requestWithHeaders;
    } else if (eventType === 'viewer-response') {
      // Intercept viewer responses
      const responseWithCookies = await attachAuthCookies(request, response);
      return responseWithCookies;
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return eventType === 'viewer-request' ? request : response;
  }
};
