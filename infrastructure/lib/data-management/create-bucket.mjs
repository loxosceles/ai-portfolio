import { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketVersioningCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables (fallback to .env for local development)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
if (!process.env.CODEBUILD_BUILD_ID) {
  // Only load .env in local development
  dotenv.config({ path: path.join(projectRoot, '.env') });
}

// Get environment from command line args
const environment = process.argv[2] || 'dev';

if (environment !== 'dev' && environment !== 'prod') {
  console.error('Error: Environment must be either "dev" or "prod"');
  console.error('Usage: node create-bucket.mjs [dev|prod]');
  process.exit(1);
}

// Initialize AWS clients
const region = process.env.AWS_DEFAULT_REGION || 'eu-central-1';
const ssmClient = new SSMClient({ region });

// Get configuration from SSM Parameter Store
async function getSSMParameter(parameterName) {
  try {
    const command = new GetParameterCommand({ Name: parameterName });
    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      return null;
    }
    throw error;
  }
}

async function getConfiguration() {
  const awsAccountId = await getSSMParameter(`/portfolio/${environment}/AWS_ACCOUNT_ID`) || process.env.AWS_ACCOUNT_ID;
  const awsAdminArn = await getSSMParameter(`/portfolio/${environment}/AWS_ADMIN_ARN`) || process.env.AWS_ADMIN_ARN;
  
  if (!awsAccountId || !awsAdminArn) {
    console.error('Error: Required configuration not found in SSM Parameter Store or environment variables');
    console.error(`Please ensure /portfolio/${environment}/AWS_ACCOUNT_ID and /portfolio/${environment}/AWS_ADMIN_ARN parameters exist`);
    process.exit(1);
  }
  
  return { awsAccountId, awsAdminArn };
}

// Set bucket name based on environment
const bucketName = environment === 'prod'
  ? process.env.PROD_DATA_BUCKET_NAME || 'portfolio-production-data'
  : process.env.DEV_DATA_BUCKET_NAME || 'portfolio-development-data';

// Initialize S3 client
const s3Client = new S3Client({ region });

async function createBucket() {
  try {
    console.log(`Creating bucket ${bucketName} in ${region} for ${environment} environment...`);
    
    // Get configuration from SSM
    const { awsAccountId, awsAdminArn } = await getConfiguration();

    // Check if bucket already exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket ${bucketName} already exists, skipping creation`);
      return;
    } catch (error) {
      if (error.name !== 'NotFound') {
        console.error('Error checking bucket existence:', error);
        process.exit(1);
      }
      // Bucket doesn't exist, continue with creation
    }

    // Create bucket with LocationConstraint for regions other than us-east-1
    const createBucketParams = {
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: region
      }
    };

    await s3Client.send(new CreateBucketCommand(createBucketParams));
    console.log(`Bucket ${bucketName} created successfully`);

    // Enable versioning
    console.log('Enabling versioning...');
    await s3Client.send(new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    }));

    // Block public access
    console.log('Blocking public access...');
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true
      }
    }));

    // Add deletion protection policy
    console.log('Adding deletion protection policy...');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyDelete',
          Effect: 'Deny',
          Principal: '*',
          Action: [
            's3:DeleteBucket',
            's3:DeleteObject',
            's3:DeleteObjectVersion'
          ],
          Resource: [
            `arn:aws:s3:::${bucketName}`,
            `arn:aws:s3:::${bucketName}/*`
          ],
          Condition: {
            StringNotEquals: {
              'aws:PrincipalArn': awsAdminArn
            }
          }
        }
      ]
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));

    console.log(`✅ Data bucket ${bucketName} created successfully in ${region} for ${environment} environment`);
  } catch (error) {
    console.error('Error creating bucket:', error);
    process.exit(1);
  }
}

createBucket();