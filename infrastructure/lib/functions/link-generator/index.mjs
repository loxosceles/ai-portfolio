import { nanoid } from 'nanoid';
import generator from 'generate-password';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Password exclusion characters to avoid issues with various systems
const PASSWORD_EXCLUDE_CHARS = '"`\'\\${}[]()!?><|&;*';

/**
 * Calculate DynamoDB TTL timestamp
 * @param {number} days Number of days from now when the item should expire
 * @returns {number} Unix timestamp for DynamoDB TTL
 */
function calculateTTL(days) {
  const secondsInDay = 24 * 60 * 60;
  return Math.floor(Date.now() / 1000) + (days * secondsInDay);
}

/**
 * Get CloudFront domain from SSM Parameter Store
 * IMPORTANT: This is retrieved at runtime to avoid circular dependency
 * LinkGeneratorStack deploys BEFORE WebStack (which creates CloudFront)
 * @param {string} region - AWS region where SSM parameter is stored (us-east-1)
 * @param {string} stage - Environment stage (dev/prod)
 * @returns {string} CloudFront domain
 */
async function getCloudFrontDomain(region, stage) {
  try {
    const ssmClient = new SSMClient({ region });
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
    awsRegionDistrib: config.aws_region_distrib,
    cognitoRegion: config.aws_region_default,
    stage: config.environment
  };
}

async function createDynamoDBEntry(tableName, linkId, password, recruiterId, region, stage) {
  try {
    const client = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(client);

    const command = new PutCommand({
      TableName: tableName,
      Item: {
        linkId,
        password,
        recruiterId,
        created_at: new Date().toISOString(),
        ttl: calculateTTL(15)
      }
    });

    await docClient.send(command);
    return true;
  } catch (error) {
    console.error('Error creating DynamoDB entry:', error);
    throw new Error(`Failed to create DynamoDB entry: ${error.message}`);
  }
}

async function checkCognitoUserExists(userPoolId, recruiterId, region) {
  try {
    const client = new CognitoIdentityProviderClient({ region });
    const username = `${recruiterId}@visitor.temporary.com`;
    
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    await client.send(command);
    return true; // User exists
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      return false; // User doesn't exist
    }
    throw error; // Other error
  }
}

async function updateCognitoUserPassword(userPoolId, recruiterId, newPassword, region) {
  try {
    const client = new CognitoIdentityProviderClient({ region });
    const username = `${recruiterId}@visitor.temporary.com`;
    
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: newPassword,
      Permanent: true
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    console.error('Error updating Cognito user password:', error);
    throw new Error(`Failed to update Cognito user password: ${error.message}`);
  }
}

async function createLink(recruiterId) {
  try {
    const config = validateEnvironment();
    
    if (!recruiterId) {
      throw new Error('recruiterId is required');
    }

    // Validate that Cognito user exists for this recruiter
    const userExists = await checkCognitoUserExists(
      config.cognitoUserPoolId,
      recruiterId,
      config.cognitoRegion
    );

    if (!userExists) {
      throw new Error(`Cognito user for recruiterId '${recruiterId}' does not exist. Create recruiter first.`);
    }

    // Generate new short linkId and password
    const linkId = nanoid(8); // Short professional ID
    const password = generator.generate({
      length: 16,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      strict: true,
      exclude: PASSWORD_EXCLUDE_CHARS
    });

    // Update Cognito user with new password (uniform logic)
    await updateCognitoUserPassword(
      config.cognitoUserPoolId,
      recruiterId,
      password,
      config.cognitoRegion
    );

    // Store linkId → password + recruiterId mapping
    await createDynamoDBEntry(
      config.visitorTableName,
      linkId,
      password,
      recruiterId,
      config.awsRegionDistrib,
      config.stage
    );

    // Get CloudFront domain from SSM
    const domainUrl = await getCloudFrontDomain(config.awsRegionDistrib, config.stage);
    const cleanDomainUrl = domainUrl.replace(/\/+$/, '');
    let linkUrl;
    try {
      const parsedUrl = new URL(cleanDomainUrl);
      linkUrl = `${parsedUrl.origin}/?visitor=${linkId}`;
    } catch {
      linkUrl = `https://${cleanDomainUrl}/?visitor=${linkId}`;
    }

    return {
      success: true,
      linkId,
      link: linkUrl,
      recruiterId
    };
  } catch (error) {
    console.error('Error creating link:', error.message);
    return {
      success: false,
      error: error.message
    };
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
      message: 'I appreciate your interest in my work. My experience with cloud architecture and full-stack development could be a great match for your needs.',
      skills: ['AWS', 'React', 'Node.js', 'TypeScript', 'Serverless']
    };

    const client = new DynamoDBClient({ region: recruiterProfilesRegion });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = recruiterProfilesTable;

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

export const handler = async (event) => {
  console.log('Link Generator Lambda invoked:', JSON.stringify(event, null, 2));
  
  try {
    const recruiterId = event.recruiterId;
    
    if (!recruiterId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'recruiterId is required'
        })
      };
    }

    const result = await createLink(recruiterId);
    
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
          recruiterId: result.recruiterId,
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

export { calculateTTL };