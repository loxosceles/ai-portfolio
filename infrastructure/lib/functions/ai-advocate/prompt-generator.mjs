/**
 * Dynamic Prompt Generator
 * 
 * This module generates dynamic prompts for the AI advocate based on developer profile data
 * and recruiter context. It fetches developer information from DynamoDB and formats it
 * into a structured prompt for the AI model.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Generates a dynamic prompt based on developer profile and recruiter context
 * @param {string} question - The question asked by the recruiter
 * @param {object} recruiterData - Data about the recruiter from the job matching table
 * @returns {string} - The generated prompt
 */
export async function generateDynamicPrompt(question, recruiterData) {
  try {
    // Get developer profile data
    const developerData = await getDeveloperData();
    
    // For debugging - log the developer data structure
    console.log('Developer data retrieved:', JSON.stringify(developerData, null, 2));
    
    // Create recruiter context section
    let recruiterContext = '';
    if (recruiterData) {
      recruiterContext = `
You are responding to ${recruiterData.recruiterName} from ${recruiterData.companyName}.
Their context is: ${recruiterData.context || 'Not specified'}
Skills they might be interested in: ${recruiterData.skills?.join(', ') || 'Not specified'}
`;
    }
    
    // Format skills section
    const skillsSection = formatSkillsSection(developerData);
    
    // Format experience section
    const experienceSection = formatExperienceSection(developerData);
    
    // Combine everything into a prompt
    const prompt = `${recruiterContext}
You are an AI Advocate representing a developer in a conversation with a recruiter.
Answer the following question about the developer's skills, experience, or background:

Question: "${question}"

Use the following information about the developer to provide an accurate, helpful response:
${skillsSection}
${experienceSection}

Keep your response professional, concise (around 150 words), and focused on the question asked.`;

    // For debugging - log the generated prompt
    console.log('Generated prompt:', prompt);
    
    return prompt;
  } catch (error) {
    console.error('Error generating dynamic prompt:', error);
    
    // Return a fallback prompt if there's an error
    return `
You are an AI Advocate representing a developer in a conversation with a recruiter.
Answer the following question about the developer's skills, experience, or background:

Question: "${question}"

Use the following information about the developer to provide an accurate, helpful response:
- Full-stack developer with experience in React, Node.js, and AWS
- 5+ years of experience building web applications
- Experience with cloud architecture, particularly with AWS services
- Strong background in serverless architectures and microservices
- Passionate about clean code, performance optimization, and user experience

Keep your response professional, concise (around 150 words), and focused on the question asked.`;
  }
}

/**
 * Gets developer data from the DynamoDB table
 * @returns {object} - Developer profile data
 */
async function getDeveloperData() {
  try {
    const tableName = process.env.DEVELOPER_TABLE_NAME;
    
    if (!tableName) {
      console.warn('DEVELOPER_TABLE_NAME environment variable is not set');
      return null;
    }
    
    // Scan the table to get all developer data
    const command = new ScanCommand({
      TableName: tableName,
      Limit: 10 // Assuming we have a small number of developer profiles
    });
    
    const response = await docClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      console.warn('No developer profiles found in the table');
      return null;
    }
    
    // Return the first active developer profile or the first profile if none are marked active
    const activeProfile = response.Items.find(item => item.isActive === true);
    return activeProfile || response.Items[0];
  } catch (error) {
    console.error('Error fetching developer data:', error);
    return null;
  }
}

/**
 * Formats the skills section of the prompt
 * @param {object} developerData - Developer profile data
 * @returns {string} - Formatted skills section
 */
function formatSkillsSection(developerData) {
  if (!developerData || !developerData.skillSets) {
    return '- Full-stack developer with experience in web development';
  }
  
  return developerData.skillSets
    .map(skillSet => {
      return `- ${skillSet.name}: ${skillSet.skills.join(', ')}`;
    })
    .join('\n');
}

/**
 * Formats the experience section of the prompt
 * @param {object} developerData - Developer profile data
 * @returns {string} - Formatted experience section
 */
function formatExperienceSection(developerData) {
  if (!developerData) {
    return '- Several years of experience in software development';
  }
  
  const lines = [];
  
  if (developerData.yearsOfExperience) {
    lines.push(`- ${developerData.yearsOfExperience}+ years of experience as a ${developerData.title || 'developer'}`);
  }
  
  if (developerData.bio) {
    lines.push(`- ${developerData.bio}`);
  }
  
  if (developerData.location) {
    lines.push(`- Based in ${developerData.location}`);
  }
  
  // Add fallback if no lines were added
  if (lines.length === 0) {
    lines.push('- Experienced developer with a passion for quality code');
  }
  
  return lines.join('\n');
}

/**
 * Test function to verify the prompt generation
 * This can be called directly from the Lambda handler for testing
 * @param {string} question - Test question
 * @param {object} recruiterData - Optional test recruiter data
 * @returns {Promise<object>} - Test results
 */
export async function testPromptGeneration(question = 'What are your skills?', recruiterData = null) {
  try {
    console.log('Starting prompt generation test...');
    console.log('Developer table name:', process.env.DEVELOPER_TABLE_NAME);
    
    // Test developer data retrieval
    const developerData = await getDeveloperData();
    console.log('Developer data retrieved:', developerData ? 'Yes' : 'No');
    
    // Generate a prompt
    const prompt = await generateDynamicPrompt(question, recruiterData);
    
    return {
      success: true,
      developerDataFound: !!developerData,
      developerTableName: process.env.DEVELOPER_TABLE_NAME,
      prompt,
      developerData: developerData ? {
        id: developerData.id,
        name: developerData.name,
        title: developerData.title,
        skillSetsCount: developerData.skillSets?.length || 0
      } : null
    };
  } catch (error) {
    console.error('Test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      developerTableName: process.env.DEVELOPER_TABLE_NAME
    };
  }
}