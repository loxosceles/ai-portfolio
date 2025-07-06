import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

// Get environment from command line args
const environment = process.argv[2] || 'dev';

// Load environment-specific .env file first
dotenv.config({ path: path.join(projectRoot, 'infrastructure', `.env.${environment}`) });

// Load common variables from default .env file
dotenv.config({ path: path.join(projectRoot, 'infrastructure', '.env') });

if (environment !== 'dev' && environment !== 'prod') {
  console.error('Error: Environment must be either "dev" or "prod"');
  console.error('Usage: node upload-data.mjs [dev|prod]');
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

async function uploadData() {
  try {
    console.log(`Uploading ${environment} data to S3 bucket ${bucketName} in ${region}...`);

    const files = ['projects.json', 'developer.json'];
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        console.error(`Error: ${file} not found in ${dataDir} directory`);
        process.exit(1);
      }
      
      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      // Upload to S3
      console.log(`Uploading ${file}...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: `${environment}/${file}`,
        Body: fileContent,
        ContentType: 'application/json'
      }));
      
      console.log(`✅ Successfully uploaded ${file}`);
    }
    
    console.log(`✅ ${environment} data uploaded successfully to s3://${bucketName}/${environment}/`);
  } catch (error) {
    console.error('Error uploading data:', error);
    process.exit(1);
  }
}

uploadData();