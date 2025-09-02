import generator from 'generate-password';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Initialize clients
const ssmClient = new SSMClient({ region: process.env.AWS_REGION_DISTRIB });
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION_DEFAULT });
const dynamoDistribClient = new DynamoDBClient({ region: process.env.AWS_REGION_DISTRIB });
const docDistribClient = DynamoDBDocumentClient.from(dynamoDistribClient);
const dynamoDefaultClient = new DynamoDBClient({ region: process.env.AWS_REGION_DEFAULT });
const docDefaultClient = DynamoDBDocumentClient.from(dynamoDefaultClient);

// Password generation configuration
const PASSWORD_CONFIG = {
  length: 16,
  numbers: true,
  symbols: true,
  uppercase: true,
  lowercase: true,
  strict: true,
  // Password exclusion characters to avoid issues with various systems
  exclude: '"`\'\\${}[]()!?><|&;*'
};

// Remove eager validation:
// const config = validateEnvironment();

// Lazy config cache + accessor
let __configCache;
function getConfig() {
  if (!__configCache) {
    __configCache = validateEnvironment();
  }
  return __configCache;
}

/**
 * Calculate expiry helpers
 * @param {number} [days=15] Days from now until expiry
 * @returns {{ ttl: number, linkExpiry: string }} TTL in seconds and ISO link expiry
 */
function generateExpiryFormats(days = 15) {
  const dayInMs = 24 * 60 * 60 * 1000;
  const expiryInMs = Date.now() + days * dayInMs;

  return {
    ttl: Math.floor(expiryInMs / 1000),
    linkExpiry: new Date(expiryInMs).toISOString()
  };
}

/**
 * Get CloudFront domain from SSM Parameter Store
 * IMPORTANT: This is retrieved at runtime to avoid circular dependency
 * LinkGeneratorStack deploys BEFORE WebStack (which creates CloudFront)
 * @param {string} region - AWS region where SSM parameter is stored (us-east-1)
 * @param {string} stage - Environment stage (dev/prod)
 * @returns {string} CloudFront domain
 */
async function getCloudFrontDomain(stage) {
  try {
    const command = new GetParameterCommand({
      Name: `/portfolio/${stage}/CLOUDFRONT_DOMAIN`
    });

    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error('Error fetching CloudFront domain from SSM:', error);
    throw new Error(`Failed to get CloudFront domain: ${error.message}`);
  }
}

function validateEnvironment() {
  const requiredEnvVars = [
    'VISITOR_TABLE_NAME',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION_DISTRIB',
    'AWS_REGION_DEFAULT',
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

  return {
    visitorTableName: config.visitor_table_name,
    cognitoUserPoolId: config.cognito_user_pool_id,
    cognitoClientId: config.cognito_client_id,
    recruiterProfilesTable: config.recruiter_profiles_table_name,
    stage: config.environment
  };
}

async function createDynamoDBEntry(tableName, linkId, password) {
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: {
        linkId,
        password,
        created_at: new Date().toISOString(),
        ttl: generateExpiryFormats(15).ttl
      }
    });

    await docDistribClient.send(command);
    return true;
  } catch (error) {
    console.error('Error creating DynamoDB entry:', error);
    throw new Error(`Failed to create DynamoDB entry: ${error.message}`);
  }
}

async function checkCognitoUserExists(userPoolId, linkId) {
  try {
    const username = `${linkId}@visitor.temporary.com`;

    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });

    await cognitoClient.send(command);
    return true; // User exists
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      return false; // User doesn't exist
    }
    throw error; // Other error
  }
}

async function updateCognitoUserPassword(userPoolId, linkId, newPassword) {
  try {
    const username = `${linkId}@visitor.temporary.com`;

    const command = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: newPassword,
      Permanent: true
    });

    await cognitoClient.send(command);
    return true;
  } catch (error) {
    console.error('Error updating Cognito user password:', error);
    throw new Error(`Failed to update Cognito user password: ${error.message}`);
  }
}

async function createLink(linkId, config) {
  try {
    if (!linkId) {
      throw new Error('linkId is required');
    }

    // Validate that Cognito user exists for this linkId
    const userExists = await checkCognitoUserExists(config.cognitoUserPoolId, linkId);

    if (!userExists) {
      throw new Error(
        `Cognito user for linkId '${linkId}' does not exist. Create recruiter first.`
      );
    }

    // Generate password
    const password = generator.generate(PASSWORD_CONFIG);

    // Update Cognito user with new password
    await updateCognitoUserPassword(config.cognitoUserPoolId, linkId, password);

    // Store linkId → password mapping in VisitorLinks table
    await createDynamoDBEntry(config.visitorTableName, linkId, password);

    // Get CloudFront domain from SSM
    const domainUrl = await getCloudFrontDomain(config.stage);
    const cleanDomainUrl = domainUrl.replace(/\/+$/, '');
    let linkUrl;
    try {
      const parsedUrl = new URL(cleanDomainUrl);
      linkUrl = `${parsedUrl.origin}/?visitor=${linkId}`;
    } catch {
      linkUrl = `https://${cleanDomainUrl}/?visitor=${linkId}`;
    }

    // Update RecruiterProfile with link info
    await updateRecruiterProfile(config.recruiterProfilesTable, linkId, linkUrl);

    return {
      success: true,
      linkId,
      link: linkUrl
    };
  } catch (error) {
    console.error('Error creating link:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function updateRecruiterProfile(tableName, linkId, linkUrl) {
  try {
    const { linkExpiry } = generateExpiryFormats(15);

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { linkId },
      UpdateExpression: 'SET linkUrl = :linkUrl, linkExpiry = :linkExpiry',
      ExpressionAttributeValues: {
        ':linkUrl': linkUrl,
        ':linkExpiry': linkExpiry
      },
      ReturnValues: 'ALL_NEW'
    });

    await docDefaultClient.send(command);
    return true;
  } catch (error) {
    console.error('Error updating recruiter profile:', error);
    throw new Error(`Failed to update recruiter profile: ${error.message}`);
  }
}

async function createRecruiterProfileData(linkId) {
  try {
    const recruiterProfilesTable = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!recruiterProfilesTable) {
      console.log('Skipping recruiter profile creation (RECRUITER_PROFILES_TABLE_NAME not set)');
      return false;
    }

    const recruiterProfilesRegion = process.env.AWS_REGION_DEFAULT;
    if (!recruiterProfilesRegion) {
      console.log('Skipping recruiter profile creation (AWS_REGION_DEFAULT not set)');
      return false;
    }

    const environment = process.env.ENVIRONMENT;
    if (environment === 'prod') {
      console.log('Skipping recruiter profile creation in production environment');
      return false;
    }

    const recruiterProfileData = {
      linkId,
      companyName: 'New Company',
      recruiterName: 'New Recruiter',
      context: 'Software Engineering',
      greeting: 'Welcome! Thanks for checking out my portfolio.',
      message:
        'I appreciate your interest in my work. My experience with cloud architecture and full-stack development could be a great match for your needs.',
      skills: ['AWS', 'React', 'Node.js', 'TypeScript', 'Serverless']
    };

    const tableName = recruiterProfilesTable;

    const command = new PutCommand({
      TableName: tableName,
      Item: recruiterProfileData
    });

    await docDefaultClient.send(command);
    console.log('Recruiter profile data created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating recruiter profile data:', error);
    return false;
  }
}

async function removeLink(linkId, config) {
  try {
    if (!linkId) {
      throw new Error('linkId is required');
    }

    const command = new UpdateCommand({
      TableName: config.recruiterProfilesTable,
      Key: { linkId },
      UpdateExpression: 'REMOVE linkUrl, linkExpiry',
      ReturnValues: 'ALL_NEW'
    });

    await docDefaultClient.send(command);

    return {
      success: true,
      message: 'Link removed successfully'
    };
  } catch (error) {
    console.error('Error removing link:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const handler = async (event) => {
  // Resolve once per cold start, reuse across warm starts
  const config = (__configCache ??= validateEnvironment());

  const { linkId, action = 'generate' } = event ?? {};

  console.log('Link Generator Lambda invoked:', JSON.stringify(event, null, 2));

  try {
    if (!linkId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'linkId is required'
        })
      };
    }

    if (action === 'remove') {
      const result = await removeLink(linkId, config);

      return {
        statusCode: result.success ? 200 : 500,
        body: JSON.stringify(result)
      };
    }

    // Default: generate action
    const result = await createLink(linkId, config);

    if (result.success) {
      const createProfiles = event.createRecruiterProfile || false;
      if (createProfiles) {
        await createRecruiterProfileData(result.linkId);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          linkId: result.linkId,
          link: result.link,
          message: 'Link created successfully'
        })
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: result.error
        })
      };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Keep existing export
export { generateExpiryFormats };
