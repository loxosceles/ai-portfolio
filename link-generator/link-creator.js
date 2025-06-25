require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const generator = require('generate-password');
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Validation function
function validateEnvironment() {
  const requiredEnvVars = [
    'DYNAMODB_TABLE_NAME',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION_DYNAMODB',
    'AWS_REGION_COGNITO',
    'OUTPUT_FILE_PATH',
    'DOMAIN_URL'
  ];

  const missingVars = [];
  const config = {};

  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    } else {
      config[varName.toLowerCase()] = value;
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log('Configuration:', config);
  return {
    dynamoDbTableName: config.dynamodb_table_name,
    cognitoUserPoolId: config.cognito_user_pool_id,
    cognitoClientId: config.cognito_client_id,
    dynamoDbRegion: config.aws_region_dynamodb,
    cognitoRegion: config.aws_region_cognito,
    outputFilePath: config.output_file_path,
    domainUrl: config.domain_url
  };
}

async function createDynamoDBEntry(tableName, linkId, password, region) {
  try {
    // Create DynamoDB client
    const client = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(client);

    // Calculate TTL (15 days from now)
    const fifteenDaysInSeconds = 15 * 24 * 60 * 60;
    const ttl = Math.floor(Date.now() / 1000) + fifteenDaysInSeconds;

    // Create the item
    const command = new PutCommand({
      TableName: tableName,
      Item: {
        linkId,
        password,
        created_at: new Date().toISOString(),
        ttl
      }
    });

    // Put the item in the table
    await docClient.send(command);
    return true;
  } catch (error) {
    console.error('Error creating DynamoDB entry:', error);
    throw new Error(`Failed to create DynamoDB entry: ${error.message}`);
  }
}

async function createCognitoUser(userPoolId, clientId, linkId, region) {
  try {
    const client = new CognitoIdentityProviderClient({
      region
    });

    const username = `${linkId}@visitor.temporary.com`;
    const password = generator.generate({
      length: 16,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      strict: true,
      exclude: '"`\'\\${}[]()!?><|&;*' // Exclude characters that might break the shell command
    });

    // Create the user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        {
          Name: 'email',
          Value: username
        },
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    });

    await client.send(createCommand);

    // Set the password as permanent
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true
    });

    await client.send(setPasswordCommand);

    // Get the tokens
    const authCommand = new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    const authResponse = await client.send(authCommand);

    return {
      username,
      password,
      tokens: authResponse.AuthenticationResult
    };
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

// Function to create the link
async function createLink() {
  try {
    const config = validateEnvironment();
    const linkId = uuidv4();

    const credentials = await createCognitoUser(
      config.cognitoUserPoolId,
      config.cognitoClientId,
      linkId,
      config.cognitoRegion
    );

    await createDynamoDBEntry(
      config.dynamoDbTableName,
      linkId,
      credentials.password,
      config.dynamoDbRegion
    );

    const cleanDomainUrl = config.domainUrl.replace(/\/+$/, '');
    const linkUrl = `${cleanDomainUrl}/?visitor=${linkId}`;

    await fs.writeFile(config.outputFilePath, `${linkUrl}\n`, 'utf8');

    return {
      success: true,
      linkId,
      link: linkUrl,
      username: credentials.username,
      password: credentials.password,
      tokens: credentials.tokens
    };
  } catch (error) {
    console.error('Error creating link:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  try {
    const result = await createLink();
    if (result.success) {
      console.log('\nLink created successfully!');
      console.log('Link:', result.link);
      console.log('Link has been saved to:', process.env.OUTPUT_FILE_PATH);
      console.log('\nCredentials for testing:');
      console.log('Username:', result.username);
      console.log('Temporary Password:', result.password);
      console.log('Tokens:', JSON.stringify(result.tokens, null, 2));
      console.log('\nTest with:');
      console.log(`aws cognito-idp admin-initiate-auth \\
--user-pool-id ${process.env.COGNITO_USER_POOL_ID} \\
--client-id ${process.env.COGNITO_CLIENT_ID} \\
--auth-flow ADMIN_USER_PASSWORD_AUTH \\
--auth-parameters USERNAME="${result.username}",PASSWORD="${result.password}" \\
--region ${process.env.AWS_REGION_COGNITO}`);
    } else {
      console.error('Failed to create link:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Execute main if this is the main module
if (require.main === module) {
  main();
}

// Export for testing or importing
module.exports = {
  createLink,
  main
};
