import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { validateData } from '../../data-management/validate-data.mjs';

// Initialize clients
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract environment from event or use default
    const environment = event.ResourceProperties?.environment || process.env.ENVIRONMENT || 'dev';
    console.log(`Loading data for environment: ${environment}`);
    
    // Determine bucket name based on environment
    const bucketName = environment === 'prod' 
      ? process.env.PROD_DATA_BUCKET_NAME 
      : process.env.DEV_DATA_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error(`Data bucket name not defined for ${environment} environment`);
    }
    
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
      PhysicalResourceId: `DataLoader-${environment}-${new Date().toISOString()}`,
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

async function writeToDynamoDB(developers, projects, environment) {
  // Write developers to DynamoDB
  if (developers.length > 0) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [`PortfolioDevelopers-${environment}`]: developers.map((dev) => ({
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
          [`PortfolioProjects-${environment}`]: projects.map((proj) => ({
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