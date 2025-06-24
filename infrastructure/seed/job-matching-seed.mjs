import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Get stage from environment
const stage = process.env.ENVIRONMENT || 'dev';
const tableName = `JobMatching-${stage}`;

// Sample job matching data
const sampleData = [
  {
    linkId: 'test123',
    companyName: 'Example Tech',
    recruiterName: 'Jane Smith',
    context: 'Full Stack Development',
    greeting: 'Hi Jane! Thanks for checking out my portfolio.',
    message:
      'I noticed Example Tech is looking for Full Stack developers. My experience with AWS, React, and Node.js aligns perfectly with your requirements.',
    skills: ['AWS', 'React', 'Node.js', 'TypeScript', 'DynamoDB']
  },
  {
    linkId: '296850ee-5f11-4a5f-910a-a6c2dff8f52e',
    companyName: 'Test Company',
    recruiterName: 'John Doe',
    context: 'Full Stack Developer',
    greeting: 'Hi John! Thanks for checking out my portfolio.',
    message:
      'I see Test Company is looking for Full Stack developers. My experience with AWS, React, and serverless architectures would be a great fit.',
    skills: ['AWS', 'React', 'Node.js', 'Lambda', 'DynamoDB']
  },
  {
    linkId: 'demo456',
    companyName: 'Innovation Labs',
    recruiterName: 'Mark Johnson',
    context: 'Cloud Architecture',
    greeting: 'Hello Mark! Great to connect with Innovation Labs.',
    message:
      'Your focus on cloud architecture matches my experience designing scalable AWS solutions and implementing serverless architectures.',
    skills: ['AWS CDK', 'Serverless', 'Lambda', 'API Gateway', 'DynamoDB']
  }
];

// Seed the table
async function seedTable() {
  console.log(`Seeding ${tableName} table...`);

  try {
    for (const item of sampleData) {
      console.log(`Adding item for ${item.companyName}...`);

      const command = new PutCommand({
        TableName: tableName,
        Item: item
      });

      await docClient.send(command);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding table:', error);
  }
}

// Run the seed function
seedTable();
