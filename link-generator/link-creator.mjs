// Load base .env file first
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import generator from 'generate-password';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Load base .env file first
dotenv.config();

// Then load environment-specific .env file to override any duplicate variables
const environment = process.env.ENVIRONMENT;
if (environment) {
  dotenv.config({ path: `.env.${environment}` });
}

// Validation function
function validateEnvironment() {
  const requiredEnvVars = [
    'VISITOR_TABLE_NAME',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION_DISTRIB',
    'AWS_REGION_DEFAULT',
    'OUTPUT_FILE_PATH',
    'CLOUDFRONT_DOMAIN',
    'RECRUITER_PROFILES_TABLE_NAME',
    'ENVIRONMENT'
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
    visitorTableName: config.visitor_table_name,
    cognitoUserPoolId: config.cognito_user_pool_id,
    cognitoClientId: config.cognito_client_id,
    dynamoDbRegion: config.aws_region_distrib,
    cognitoRegion: config.aws_region_default,
    outputFilePath: config.output_file_path,
    domainUrl: config.cloudfront_domain,
    stage: config.environment
  };
}

async function createDynamoDBEntry(tableName, linkId, password, region, stage) {
  try {
    // Create DynamoDB client
    const client = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(client);

    // Calculate TTL (15 days from now)
    const fifteenDaysInSeconds = 15 * 24 * 60 * 60;
    const ttl = Math.floor(Date.now() / 1000) + fifteenDaysInSeconds;

    // Create the item
    const command = new PutCommand({
      TableName: `${tableName}-${stage}`,
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
      exclude: '"`\\\\\'\\${}[]()!?><|&;*' // Exclude characters that might break the shell command
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
      config.visitorTableName,
      linkId,
      credentials.password,
      config.dynamoDbRegion,
      config.stage
    );

    const cleanDomainUrl = config.domainUrl.replace(/\/+$/, '');
    const linkUrl = cleanDomainUrl.startsWith('http') 
      ? `${cleanDomainUrl}/?visitor=${linkId}`
      : `https://${cleanDomainUrl}/?visitor=${linkId}`;

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

// Create recruiter profile data for a new link
async function createRecruiterProfileData(linkId) {
  try {
    // Check if recruiter profiles environment variables are set
    const recruiterProfilesTable = process.env.RECRUITER_PROFILES_TABLE_NAME;
    
    if (!recruiterProfilesTable) {
      console.log('\nSkipping recruiter profile creation (RECRUITER_PROFILES_TABLE_NAME not set)');
      return false;
    }
    
    // Get region from environment variable
    const recruiterProfilesRegion = process.env.AWS_REGION_DEFAULT;
    if (!recruiterProfilesRegion) {
      console.log('\nSkipping recruiter profile creation (AWS_REGION_DEFAULT not set)');
      return false;
    }

    // Check if we're in production
    const environment = process.env.ENVIRONMENT;
    if (environment === 'prod') {
      console.log('\nSkipping recruiter profile creation in production environment');
      return false;
    }

    console.log('\nCreating recruiter profile data...');

    // Sample recruiter profile data
    const recruiterProfileData = {
      linkId,
      companyName: 'New Company',
      recruiterName: 'New Recruiter',
      context: 'Software Engineering',
      greeting: `Welcome! Thanks for checking out my portfolio.`,
      message:
        'I appreciate your interest in my work. My experience with cloud architecture and full-stack development could be a great match for your needs.',
      skills: ['AWS', 'React', 'Node.js', 'TypeScript', 'Serverless']
    };

    // Create DynamoDB client for recruiter profiles table
    const client = new DynamoDBClient({ region: recruiterProfilesRegion });
    const docClient = DynamoDBDocumentClient.from(client);

    // Add to recruiter profiles table
    const tableName = `${recruiterProfilesTable}-${environment}`;
    console.log(`Using recruiter profiles table: ${tableName}`);
    
    const command = new PutCommand({
      TableName: tableName,
      Item: recruiterProfileData
    });

    await docClient.send(command);
    console.log('Recruiter profile data created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating recruiter profile data:', error);
    return false;
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

      // Create recruiter profile data if requested
      const createJobMatching = process.argv.includes('--create-job-matching');
      if (createJobMatching) {
        await createRecruiterProfileData(result.linkId);
      } else {
        console.log('\nTo create recruiter profile data, run with --create-job-matching flag');
      }

      console.log('\nTest with:');
      console.log(`aws cognito-idp admin-initiate-auth \\
--user-pool-id ${process.env.COGNITO_USER_POOL_ID} \\
--client-id ${process.env.COGNITO_CLIENT_ID} \\
--auth-flow ADMIN_USER_PASSWORD_AUTH \\
--auth-parameters USERNAME="${result.username}",PASSWORD='${result.password}' \\
--region ${process.env.AWS_REGION_DEFAULT}`);
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
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

// Export for testing or importing
export { createLink, main };