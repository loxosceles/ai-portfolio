import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize DynamoDB clients for different regions
const jobMatchingDynamoDB = new DynamoDBClient({ region: 'eu-central-1' });
const jobMatchingDocClient = DynamoDBDocumentClient.from(jobMatchingDynamoDB);

const linkDynamoDB = new DynamoDBClient({ region: 'us-east-1' });
const linkDocClient = DynamoDBDocumentClient.from(linkDynamoDB);

// Get stage from environment
const stage = process.env.ENVIRONMENT || 'dev';
const jobMatchingTableName = `JobMatching-${stage}`;
const linkTableName = `portfolio-visitor-links-${stage}`;

// Sample job matching templates
const sampleTemplates = [
  {
    companyName: 'Example Tech',
    recruiterName: 'Jane Smith',
    context: 'Full Stack Development',
    greeting: 'Hi Jane! Thanks for checking out my portfolio.',
    message:
      'I noticed Example Tech is looking for Full Stack developers. My experience with AWS, React, and Node.js aligns perfectly with your requirements.',
    skills: ['AWS', 'React', 'Node.js', 'TypeScript', 'DynamoDB']
  },
  {
    companyName: 'Test Company',
    recruiterName: 'John Doe',
    context: 'Full Stack Developer',
    greeting: 'Hi John! Thanks for checking out my portfolio.',
    message:
      'I see Test Company is looking for Full Stack developers. My experience with AWS, React, and serverless architectures would be a great fit.',
    skills: ['AWS', 'React', 'Node.js', 'Lambda', 'DynamoDB']
  },
  {
    companyName: 'Innovation Labs',
    recruiterName: 'Mark Johnson',
    context: 'Cloud Architecture',
    greeting: 'Hello Mark! Great to connect with Innovation Labs.',
    message:
      'Your focus on cloud architecture matches my experience designing scalable AWS solutions and implementing serverless architectures.',
    skills: ['AWS CDK', 'Serverless', 'Lambda', 'API Gateway', 'DynamoDB']
  }
];

// Fallback linkIds in case no real links exist
const fallbackLinkIds = ['test123', 'c3c45862-a001-7080-a578-96018354da66', 'demo456'];

// Get real linkIds from the link table
async function getLinkIds() {
  try {
    const command = new ScanCommand({
      TableName: linkTableName,
      ProjectionExpression: 'linkId'
    });

    const response = await linkDocClient.send(command);
    const linkIds = response.Items?.map(item => item.linkId) || [];
    
    console.log(`Found ${linkIds.length} real linkIds in the link table`);
    
    // If we found real linkIds, use them; otherwise use fallbacks
    return linkIds.length > 0 ? linkIds : fallbackLinkIds;
  } catch (error) {
    console.error('Error fetching linkIds:', error);
    return fallbackLinkIds;
  }
}

// Seed the table
async function seedTable() {
  console.log(`Seeding ${jobMatchingTableName} table...`);

  try {
    // Get real linkIds from the link table
    const linkIds = await getLinkIds();
    
    // Create job matching data using real linkIds
    const jobMatchingData = [];
    
    // Assign templates to linkIds
    for (let i = 0; i < linkIds.length; i++) {
      const template = sampleTemplates[i % sampleTemplates.length];
      jobMatchingData.push({
        linkId: linkIds[i],
        ...template
      });
    }
    
    // Add data to the job matching table
    for (const item of jobMatchingData) {
      console.log(`Adding item for ${item.companyName} with linkId ${item.linkId}...`);

      const command = new PutCommand({
        TableName: jobMatchingTableName,
        Item: item
      });

      await jobMatchingDocClient.send(command);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding table:', error);
  }
}

// Only run in development environment
if (stage === 'prod') {
  console.error('Seeding not allowed in production environment');
  process.exit(1);
} else {
  // Run the seed function
  seedTable();
}
