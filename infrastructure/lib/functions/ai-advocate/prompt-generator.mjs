/**
 * Dynamic Prompt Generator
 *
 * This module generates dynamic prompts for the AI advocate based on developer profile data
 * and recruiter context. It fetches developer information from DynamoDB and formats it
 * into a structured prompt for the AI model.
 *
 * The prompt uses a prioritized rules system to guide the AI's responses.
 */

// Import simplified prompt rules
import PROMPT_RULES from './prompt-rules.mjs';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDeveloperProjects, formatProjectsSection } from './project-utils.mjs';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Generates a dynamic prompt based on developer profile and recruiter context
 * @param {string} question - The question asked by the recruiter
 * @param {object} recruiterData - Data about the recruiter from the recruiter profile table
 * @returns {string} - The generated prompt
 */
export async function generateDynamicPrompt(question, recruiterData) {
  try {
    // Get developer profile data
    const developerData = await getDeveloperData();
    if (!developerData) {
      const tableName = process.env.DEVELOPER_TABLE_NAME;
      throw new Error(`No developer profile found in table: ${tableName || 'undefined'}. Please check that DEVELOPER_TABLE_NAME is set and the table contains data.`);
    }

    // For debugging - log the developer data structure
    console.log('Developer data retrieved:', JSON.stringify(developerData, null, 2));

    // Get developer projects
    const developerProjects = await getDeveloperProjects(docClient, developerData.id);
    console.log('Developer projects retrieved:', developerProjects.length);

    // Find relevant skills based on recruiter data
    const relevantSkills = findRelevantSkills(recruiterData, developerData);

    // Simple conversation context
    const conversationContext = recruiterData?.conversationHistory?.length > 0 
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

    // Build rules section
    const rulesSection = buildRulesSection(developerName);

    // Combine everything into a prompt with named blocks
    const prompt = `${recruiterContext}
${conversationContext}

You are an AI Advocate named Alex representing ${developerFullName} in a conversation with a recruiter.
Your task is to answer the following question about ${developerName}'s skills, experience, or background in a conversational, helpful way. Answer ONLY this specific question:

Question: "${question}"

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
}

${rulesSection}`;

    // For debugging - log the generated prompt
    console.log('Generated prompt:', prompt);

    return prompt;
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
    const activeProfile = response.Items.find((item) => item.isActive === true);
    return activeProfile || response.Items[0];
  } catch (error) {
    console.error('Error fetching developer data:', error);
    return null;
  }
}

/**
 * Find matching skills between recruiter interests and developer skills
 * @param {object} recruiterData - Data about the recruiter from the job matching table
 * @param {object} developerData - Developer profile data
 * @returns {object} - Object containing matching skills and other relevant info
 */
function findRelevantSkills(recruiterData, developerData) {
  // Default result with no matches
  const result = {
    matchingSkills: [],
    allDeveloperSkills: new Set(),
    recruiterSkills: [],
    hasMatches: false
  };

  // If no recruiter data or developer data, return empty result
  if (!recruiterData || !developerData || !developerData.skillSets) {
    return result;
  }

  // Extract recruiter skills (case insensitive)
  const recruiterSkills = recruiterData.requiredSkills || recruiterData.preferredSkills || [];
  result.recruiterSkills = recruiterSkills;

  if (recruiterSkills.length === 0) {
    return result;
  }

  // Create a set of all developer skills (lowercase for case-insensitive matching)
  const developerSkillsMap = new Map(); // Maps lowercase skill to original case

  developerData.skillSets.forEach((skillSet) => {
    if (skillSet.skills && Array.isArray(skillSet.skills)) {
      skillSet.skills.forEach((skill) => {
        const lowerSkill = skill.toLowerCase();
        result.allDeveloperSkills.add(skill);
        developerSkillsMap.set(lowerSkill, skill);
      });
    }
  });

  // Find matching skills
  recruiterSkills.forEach((recruiterSkill) => {
    const lowerRecruiterSkill = recruiterSkill.toLowerCase();

    // Check for exact matches
    if (developerSkillsMap.has(lowerRecruiterSkill)) {
      result.matchingSkills.push({
        skill: developerSkillsMap.get(lowerRecruiterSkill),
        type: 'exact'
      });
      result.hasMatches = true;
      return;
    }

    // Check for partial matches (e.g., "React" matches "React.js")
    for (const [lowerDevSkill, originalDevSkill] of developerSkillsMap.entries()) {
      if (
        lowerDevSkill.includes(lowerRecruiterSkill) ||
        lowerRecruiterSkill.includes(lowerDevSkill)
      ) {
        result.matchingSkills.push({
          skill: originalDevSkill,
          type: 'partial',
          recruiterSkill: recruiterSkill
        });
        result.hasMatches = true;
      }
    }
  });

  return result;
}

/**
 * Formats the skills section of the prompt
 * @param {object} developerData - Developer profile data
 * @param {object} relevantSkills - Result from findRelevantSkills
 * @returns {string} - Formatted skills section
 */
function formatSkillsSection(developerData, relevantSkills = null) {
  if (!developerData || !developerData.skillSets) {
    return '- Full-stack developer with experience in web development';
  }

  // If we have matching skills, highlight them first
  if (relevantSkills && relevantSkills.hasMatches) {
    const matchingSkillsSection =
      '- Matching skills: ' + relevantSkills.matchingSkills.map((match) => match.skill).join(', ');

    const regularSkillsSection = developerData.skillSets
      .map((skillSet) => {
        return `- ${skillSet.name}: ${skillSet.skills.join(', ')}`;
      })
      .join('\n');

    return matchingSkillsSection + '\n' + regularSkillsSection;
  }

  // Otherwise, return all skills as before
  return developerData.skillSets
    .map((skillSet) => {
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
    lines.push(
      `- ${developerData.yearsOfExperience}+ years of experience as a ${developerData.title || 'developer'}`
    );
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
 * Build rules section
 * @param {string} developerName - Developer's name for personalization
 * @returns {string} - Formatted rules section
 */
function buildRulesSection(developerName) {
  const allRules = [
    ...PROMPT_RULES.accuracy,
    ...PROMPT_RULES.style,
    ...PROMPT_RULES.special
  ].filter(rule => rule);

  const highPriorityRules = allRules.filter(rule => rule.priority === 'high');
  const mediumPriorityRules = allRules.filter(rule => rule.priority === 'medium');
  const lowPriorityRules = allRules.filter(rule => rule.priority === 'low');

  let formattedRules = '';
  if (highPriorityRules.length > 0) {
    formattedRules += 'High Priority:\n' + 
      highPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n') + '\n\n';
  }
  if (mediumPriorityRules.length > 0) {
    formattedRules += 'Medium Priority:\n' + 
      mediumPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n') + '\n\n';
  }
  if (lowPriorityRules.length > 0) {
    formattedRules += 'Low Priority:\n' + 
      lowPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n');
  }

  return `Response Guidelines:\n${formattedRules.trim()}`;
}


