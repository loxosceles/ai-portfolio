import { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketVersioningCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Get environment from command line args
const environment = process.argv[2] || 'dev';

if (environment !== 'dev' && environment !== 'prod') {
  console.error('Error: Environment must be either "dev" or "prod"');
  console.error('Usage: node create-bucket.mjs [dev|prod]');
  process.exit(1);
}

// Check required environment variables
const requiredEnvVars = ['AWS_ACCOUNT_ID', 'AWS_ADMIN_ARN', 'AWS_REGION'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is required in .env file`);
    process.exit(1);
  }
}

// Set bucket name based on environment
const bucketName = environment === 'prod'
  ? process.env.PROD_DATA_BUCKET_NAME || 'portfolio-production-data'
  : process.env.DEV_DATA_BUCKET_NAME || 'portfolio-development-data';

const region = process.env.AWS_REGION || 'eu-central-1';

// Initialize S3 client
const s3Client = new S3Client({ region });

async function createBucket() {
  try {
    console.log(`Creating bucket ${bucketName} in ${region} for ${environment} environment...`);

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
              'aws:PrincipalArn': process.env.AWS_ADMIN_ARN
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