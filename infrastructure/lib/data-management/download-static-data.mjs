import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Get environment from command line args
const environment = process.argv[2] || 'dev';

if (environment !== 'dev' && environment !== 'prod') {
  console.error('Error: Environment must be either "dev" or "prod"');
  console.error('Usage: node download-data.mjs [dev|prod]');
  process.exit(1);
}

// Set bucket name based on environment
const bucketName = environment === 'prod'
  ? process.env.PROD_DATA_BUCKET_NAME || 'portfolio-production-data'
  : process.env.DEV_DATA_BUCKET_NAME || 'portfolio-development-data';

// Data directory is within the data-management structure
const dataDir = path.join(__dirname, 'data', environment);

const region = process.env.AWS_REGION || 'eu-central-1';

// Initialize S3 client
const s3Client = new S3Client({ region });

async function downloadData() {
  try {
    console.log(`Downloading ${environment} data from S3 bucket ${bucketName} in ${region}...`);

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    const files = ['projects.json', 'developer.json'];
    
    for (const file of files) {
      const s3Key = `${environment}/${file}`;
      const localPath = path.join(dataDir, file);
      
      try {
        // Check if file exists in S3
        await s3Client.send(new HeadObjectCommand({
          Bucket: bucketName,
          Key: s3Key
        }));
        
        // Download file from S3
        console.log(`Downloading ${file}...`);
        const response = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Key
        }));
        
        const fileContent = await response.Body.transformToString();
        
        // Write to local file
        await fs.writeFile(localPath, fileContent, 'utf-8');
        
        console.log(`✅ Successfully downloaded ${file}`);
      } catch (error) {
        if (error.name === 'NotFound') {
          console.error(`Error: ${file} not found in S3 bucket s3://${bucketName}/${s3Key}`);
          console.error('Data must exist in S3 bucket before deployment');
        } else {
          console.error(`Error downloading ${file}:`, error);
        }
        process.exit(1);
      }
    }
    
    console.log(`✅ ${environment} data downloaded successfully from s3://${bucketName}/${environment}/`);
  } catch (error) {
    console.error('Error downloading data:', error);
    process.exit(1);
  }
}

downloadData();