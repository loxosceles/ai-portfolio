#!/usr/bin/env node

/**
 * Script to create a test recruiter profile in the RecruiterProfiles table
 * 
 * Usage:
 * node create-test-recruiter-profile.mjs --stage dev --linkId test-link
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { parseArgs } from 'node:util';

// Parse command line arguments
const { values } = parseArgs({
  options: {
    stage: { type: 'string', default: 'dev' },
    linkId: { type: 'string', default: 'test-recruiter' }
  }
});

const stage = values.stage;
const linkId = values.linkId;

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Table name
const tableName = `RecruiterProfiles-${stage}`;

// Create a test recruiter profile
const testProfile = {
  linkId,
  recruiterName: 'Test Recruiter',
  companyName: 'Tech Innovations Inc.',
  context: 'Looking for a senior developer to join our cloud team',
  jobTitle: 'Senior Cloud Developer',
  jobDescription: 'We are looking for an experienced developer with strong AWS skills to help build our next-generation cloud platform.',
  requiredSkills: ['AWS', 'React', 'Node.js', 'TypeScript'],
  preferredSkills: ['CDK', 'Serverless', 'DynamoDB', 'Lambda'],
  companyIndustry: 'Technology',
  companySize: 'Medium (100-500 employees)',
  greeting: 'Welcome to the portfolio! I am the AI advocate for this developer.',
  message: 'I can help answer any questions you might have about the developer\'s skills and experience.',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

async function createTestProfile() {
  console.log(`Creating test recruiter profile in ${tableName} with linkId: ${linkId}`);
  
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: testProfile
    });
    
    await docClient.send(command);
    console.log('Test profile created successfully:', JSON.stringify(testProfile, null, 2));
  } catch (error) {
    console.error('Error creating test profile:', error);
  }
}

// Run the script
createTestProfile().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});