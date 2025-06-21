const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');

// Configure AWS clients with region
const cognito = new CognitoIdentityProviderClient({
  region: 'us-east-1'
});

const ssm = new SSMClient({
  region: 'us-east-1'
});

const secretsManager = new SecretsManagerClient({
  region: 'us-east-1'
});

// Configuration cache
let config = null;

async function getConfig() {
  if (config) return config;

  const command = new GetParametersCommand({
    Names: [
      '/portfolio/dev/edge/cognito-client-id',
      '/portfolio/dev/edge/cognito-user-pool-id',
      '/portfolio/dev/edge/service-account-secret-arn'
    ],
    WithDecryption: true
  });

  const parameters = await ssm.send(command);

  config = {
    clientId: parameters.Parameters.find((p) => p.Name.endsWith('cognito-client-id')).Value,
    userPoolId: parameters.Parameters.find((p) => p.Name.endsWith('cognito-user-pool-id')).Value,
    secretArn: parameters.Parameters.find((p) => p.Name.endsWith('service-account-secret-arn'))
      .Value
  };

  return config;
}

async function getServiceAccountPassword(secretArn) {
  const command = new GetSecretValueCommand({
    SecretId: secretArn
  });

  const result = await secretsManager.send(command);
  return result.SecretString;
}

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

    if (visitorHash) {
      try {
        // Get configuration
        const config = await getConfig();

        // Get service account password
        const serviceAccountPassword = await getServiceAccountPassword(config.secretArn);

        // Generate Cognito token using service account
        const authCommand = new AdminInitiateAuthCommand({
          UserPoolId: config.userPoolId,
          ClientId: config.clientId,
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          AuthParameters: {
            USERNAME: 'service-account',
            PASSWORD: serviceAccountPassword
          }
        });

        const authResult = await cognito.send(authCommand);
        const { IdToken, AccessToken } = authResult.AuthenticationResult;

        if (!request.headers) {
          request.headers = {};
        }

        // Add tokens to request headers for viewer-response handling
        request.headers['x-auth-tokens'] = [
          {
            key: 'X-Auth-Tokens',
            value: JSON.stringify({ IdToken, AccessToken })
          }
        ];

        // Also add visitor hash for context
        request.headers['x-visitor-hash'] = [
          {
            key: 'X-Visitor-Hash',
            value: visitorHash
          }
        ];

        console.log('Added auth tokens and visitor hash to request headers');
      } catch (error) {
        console.error('Error generating Cognito token:', error);
      }
    }

    return request;
  }

  // Handle viewer-response
  if (eventType === 'viewer-response') {
    console.log('Processing viewer-response');

    const authTokens = request.headers['x-auth-tokens']?.[0]?.value;
    const visitorHash = request.headers['x-visitor-hash']?.[0]?.value;

    if (authTokens) {
      const { IdToken, AccessToken } = JSON.parse(authTokens);

      // Set secure HTTP-only cookies
      const cookies = [
        {
          key: 'Set-Cookie',
          value: `auth_token=${IdToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
        },
        {
          key: 'Set-Cookie',
          value: `access_token=${AccessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
        }
      ];

      // Add visitor context cookie if hash exists
      if (visitorHash) {
        cookies.push({
          key: 'Set-Cookie',
          value: `visitor_hash=${visitorHash}; Path=/; Secure; SameSite=Strict; Max-Age=3600`
        });
      }

      if (!response.headers['set-cookie']) {
        response.headers['set-cookie'] = [];
      }
      response.headers['set-cookie'].push(...cookies);

      console.log('Set auth and visitor cookies in response');
    }

    return response;
  }

  return eventType === 'viewer-request' ? request : response;
};
