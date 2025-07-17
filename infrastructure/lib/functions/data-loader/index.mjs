import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize clients
// Require explicit AWS_REGION_DEFAULT environment variable (set by stack)
if (!process.env.AWS_REGION_DEFAULT) {
  throw new Error('AWS_REGION_DEFAULT environment variable is required');
}

const s3Client = new S3Client({ region: process.env.AWS_REGION_DEFAULT });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION_DEFAULT });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract environment from event or use default
    const environment = event.ResourceProperties?.environment || process.env.ENVIRONMENT || 'dev';
    console.log(`Loading data for environment: ${environment}`);
    
    // Validate environment
    if (environment !== 'dev' && environment !== 'prod') {
      throw new Error('Environment must be either "dev" or "prod"');
    }
    
    // Validate required environment variables
    if (!process.env.DATA_BUCKET_NAME) {
      throw new Error('DATA_BUCKET_NAME environment variable is required');
    }
    if (!process.env.DEVELOPER_TABLE_NAME) {
      throw new Error('DEVELOPER_TABLE_NAME environment variable is required');
    }
    if (!process.env.PROJECTS_TABLE_NAME) {
      throw new Error('PROJECTS_TABLE_NAME environment variable is required');
    }
    
    const bucketName = process.env.DATA_BUCKET_NAME;
    
    // Load developers data
    console.log(`Loading developers from s3://${bucketName}/${environment}/developer.json`);
    const developersData = await getJsonFromS3(bucketName, `${environment}/developer.json`);
    
    // Load projects data
    console.log(`Loading projects from s3://${bucketName}/${environment}/projects.json`);
    const projectsData = await getJsonFromS3(bucketName, `${environment}/projects.json`);
    
    // Validate data relationships
    validateData(developersData, projectsData);
    
    // Write to DynamoDB
    await writeToDynamoDB(developersData, projectsData, environment);
    
    // Return success for CloudFormation custom resource
    return {
      PhysicalResourceId: `DataLoader-${environment}`,
      Data: {
        Message: `Successfully loaded data for ${environment} environment`,
        DevelopersCount: developersData.length,
        ProjectsCount: projectsData.length
      }
    };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

async function getJsonFromS3(bucket, key) {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    
    const bodyContents = await streamToString(response.Body);
    return JSON.parse(bodyContents);
  } catch (error) {
    console.error(`Error getting ${key} from ${bucket}:`, error);
    throw error;
  }
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Validates the relationship between developers and projects data
 * @param {Array} developers - Array of developer objects
 * @param {Array} projects - Array of project objects
 * @throws {Error} If validation fails
 */
function validateData(developers, projects) {
  // Get all developer IDs
  const developerIds = developers.map((dev) => dev.id);

  // Validate each project has a developerId that exists
  projects.forEach((project) => {
    if (!project.developerId) {
      throw new Error(`Project ${project.id} is missing developerId`);
    }
    if (!developerIds.includes(project.developerId)) {
      throw new Error(
        `Project ${project.id} references non-existent developer ${project.developerId}`
      );
    }
  });

  // Validate skillSets structure if present
  developers.forEach((developer) => {
    if (developer.skillSets && !Array.isArray(developer.skillSets)) {
      throw new Error(`Developer ${developer.id} skillSets must be an array`);
    }

    if (developer.skillSets) {
      developer.skillSets.forEach((skillSet, index) => {
        // Check for required ID
        if (!skillSet.id) {
          throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing id`);
        }
        // Check for required name
        if (!skillSet.name) {
          throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing name`);
        }
        // Check skills array
        if (!Array.isArray(skillSet.skills)) {
          throw new Error(
            `Developer ${developer.id} skillSet at index ${index} skills must be an array`
          );
        }
      });
    }
  });
}

async function writeToDynamoDB(developers, projects, environment) {
  // Write developers to DynamoDB
  if (developers.length > 0) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [process.env.DEVELOPER_TABLE_NAME]: developers.map((dev) => ({
            PutRequest: {
              Item: dev
            }
          }))
        }
      })
    );
    console.log(`✅ Successfully wrote ${developers.length} developers to DynamoDB`);
  }

  // Write projects to DynamoDB
  if (projects.length > 0) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [process.env.PROJECTS_TABLE_NAME]: projects.map((proj) => ({
            PutRequest: {
              Item: proj
            }
          }))
        }
      })
    );
    console.log(`✅ Successfully wrote ${projects.length} projects to DynamoDB`);
  }
}