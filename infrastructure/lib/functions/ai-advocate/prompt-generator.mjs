/**
 * Dynamic Prompt Generator
 *
 * This module generates dynamic prompts for the AI advocate based on developer profile data
 * and recruiter context. It fetches developer information from DynamoDB and formats it
 * into a structured prompt for the AI model.
 *
 * The prompt uses a prioritized rules system to guide the AI's responses.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  findRelevantSkills,
  formatSkillsSection,
  formatProjectsSection,
  formatExperienceSection,
  buildRulesSection
} from './utils.mjs';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Generates a dynamic prompt based on developer profile and recruiter context
 * @param {string} question - The question asked by the recruiter
 * @param {object} recruiterData - Data about the recruiter from the recruiter profile table
 * @returns {object} - Object with systemPrompt and userPrompt
 */
export async function generateDynamicPrompt(question, recruiterData) {
  try {
    // Get developer profile data
    const developerData = await getDeveloperData();
    if (!developerData) {
      const tableName = process.env.DEVELOPER_TABLE_NAME;
      throw new Error(`No developer profile found in table: ${tableName || 'undefined'}.`);
    }

    // For debugging - log the developer data structure
    console.log('Developer data retrieved:', JSON.stringify(developerData, null, 2));

    // Get developer projects
    const developerProjects = await getDeveloperProjects(docClient, developerData.id);
    console.log('Developer projects retrieved:', developerProjects.length);

    // Find relevant skills based on recruiter data
    const relevantSkills = findRelevantSkills(recruiterData, developerData);

    // Simple conversation context
    const conversationContext =
      recruiterData?.conversationHistory?.length > 0
        ? `Context: Previous conversation with ${recruiterData.conversationHistory.length} messages.`
        : 'Context: First interaction with this recruiter.';

    // Create recruiter context section
    let recruiterContext = '';
    if (recruiterData) {
      // Extract skills from requiredSkills or preferredSkills
      const recruiterSkills = recruiterData.requiredSkills || recruiterData.preferredSkills || [];

      // Build job context if available
      let jobContext = '';
      if (recruiterData.jobTitle || recruiterData.jobDescription) {
        jobContext = `\nThey are recruiting for: ${recruiterData.jobTitle || 'a position'}`;
        if (recruiterData.jobDescription) {
          jobContext += `\nJob description: ${recruiterData.jobDescription}`;
        }
      }

      // Build company context if available
      let companyContext = '';
      if (recruiterData.companyIndustry || recruiterData.companySize) {
        companyContext = '\nCompany details:';
        if (recruiterData.companyIndustry) {
          companyContext += `\n- Industry: ${recruiterData.companyIndustry}`;
        }
        if (recruiterData.companySize) {
          companyContext += `\n- Size: ${recruiterData.companySize}`;
        }
      }

      // Build the full recruiter context
      recruiterContext = `
You are responding to ${recruiterData.recruiterName} from ${recruiterData.companyName}.${jobContext}${companyContext}
Their context is: ${recruiterData.context || 'Not specified'}
Skills they might be interested in: ${recruiterSkills.join(', ') || 'Not specified'}
`;
    }

    // Format skills section with relevant skills highlighted
    const skillsSection = formatSkillsSection(developerData, relevantSkills);

    // Format projects section
    const projectsSection = formatProjectsSection(developerProjects);

    // Format experience section
    const experienceSection = formatExperienceSection(developerData);

    // Get developer's name for personalized responses
    const developerName = developerData?.name?.split(' ')[0] || 'the developer';
    const developerFullName = developerData?.name || 'the developer';

    // Build system prompt (identity + rules)
    const systemPrompt = `You are an AI Advocate named Alex representing ${developerFullName} in conversations with recruiters.

${buildRulesSection(developerName)}`;

    // Build user prompt (question + context)
    const userPrompt = `${recruiterContext}
${conversationContext}

Question: "${question}"

Here is the developer information for reference (only use what's relevant to answer the specific question above):

===DEVELOPER_SKILLS===
${skillsSection}
===END_DEVELOPER_SKILLS===

===DEVELOPER_PROJECTS===
${projectsSection}
===END_DEVELOPER_PROJECTS===

===DEVELOPER_EXPERIENCE===
${experienceSection}
===END_DEVELOPER_EXPERIENCE===

${
  recruiterData && recruiterData.requiredSkills
    ? `===RECRUITER_INTERESTS===
Job Title: ${recruiterData.jobTitle || 'Not specified'}
Job Description: ${recruiterData.jobDescription || 'Not specified'}
Required Skills: ${(recruiterData.requiredSkills || []).join(', ')}
Preferred Skills: ${(recruiterData.preferredSkills || []).join(', ')}
===END_RECRUITER_INTERESTS===
`
    : ''
}

${
  recruiterData?.conversationHistory && recruiterData.conversationHistory.length > 0
    ? `===CONVERSATION_HISTORY===
${recruiterData.conversationHistory
  .filter((msg) => msg.role === 'user')
  .map((msg) => msg.content)
  .join('\n')}
===END_CONVERSATION_HISTORY===
`
    : ''
}`;

    // For debugging
    console.log('Generated system prompt:', systemPrompt);
    console.log('Generated user prompt:', userPrompt);

    return { systemPrompt, userPrompt };
  } catch (error) {
    console.error('Error generating dynamic prompt:', error);
    // Re-throw with more specific error information
    throw error;
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

    // Get the single developer profile using fixed key
    const command = new GetCommand({
      TableName: tableName,
      Key: { id: 'DEVELOPER_PROFILE' }
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      console.warn('No developer profile found');
      return null;
    }

    return response.Item;
  } catch (error) {
    console.error('Error fetching developer data:', error);
    return null;
  }
}

/**
 * Get developer projects from DynamoDB
 * @param {object} docClient - DynamoDB Document Client
 * @param {string} developerId - The developer's ID
 * @returns {Array} - Array of project objects
 */
async function getDeveloperProjects(docClient, developerId) {
  try {
    const tableName = process.env.PROJECTS_TABLE_NAME;

    if (!tableName) {
      throw new Error('PROJECTS_TABLE_NAME environment variable is not set');
    }

    if (!developerId) {
      throw new Error('Developer ID is required to fetch projects');
    }

    // Query the table for projects with this developerId
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'developerId = :devId',
      ExpressionAttributeValues: {
        ':devId': developerId
      }
    });

    const response = await docClient.send(command);

    if (!response.Items) {
      throw new Error(`Failed to retrieve projects for developer: ${developerId}`);
    }

    return response.Items;
  } catch (error) {
    console.error('Error fetching developer projects:', error);
    throw new Error(`Failed to fetch developer projects: ${error.message}`);
  }
}
