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
 * @param {object} recruiterData - Data about the recruiter from the recruiter profile table
 * @returns {string} - The generated prompt
 */
/**
 * We're not going to try to filter questions at the Lambda level.
 * Instead, we'll rely on the AI model to handle inappropriate questions
 * with the instructions we provide in the prompt.
 *
 * This function always returns true, effectively disabling the filter.
 *
 * @param {string} question - The question to check
 * @returns {boolean} - Always returns true
 */
function isAppropriateQuestion(question) {
  return true;
}

export { isAppropriateQuestion };

export async function generateDynamicPrompt(question, recruiterData) {
  try {
    // Get developer profile data
    const developerData = await getDeveloperData();

    // For debugging - log the developer data structure
    console.log('Developer data retrieved:', JSON.stringify(developerData, null, 2));

    // Find relevant skills based on recruiter data
    const relevantSkills = findRelevantSkills(recruiterData, developerData);

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

    // Format experience section
    const experienceSection = formatExperienceSection(developerData);

    // Get developer's name for personalized responses
    const developerName = developerData?.name?.split(' ')[0] || 'the developer';
    const developerFullName = developerData?.name || 'the developer';

    // Combine everything into a prompt
    const prompt = `${recruiterContext}
You are an AI Advocate named Alex representing ${developerFullName} in a conversation with a recruiter.
Your task is to answer the following question about ${developerName}'s skills, experience, or background in a conversational, helpful way. Answer ONLY this specific question:

Question: "${question}"

Use the following information about ${developerName} to provide an accurate, helpful response:
${skillsSection}
${experienceSection}

IMPORTANT INSTRUCTIONS:
1. NEVER start your response with phrases like "Here is the answer" or "The developer has". Instead, use conversational starters like:
   - "Based on my knowledge of ${developerName}'s background..."
   - "From what I can see in ${developerName}'s profile..."
   - "${developerName}'s experience includes..."
   - "I can tell you that ${developerName} has worked with..."
   - "Looking at ${developerName}'s skill set..."
2. ONLY claim experience with technologies that are EXPLICITLY listed in ${developerName}'s skills above. This is CRITICAL - never mention a technology as part of ${developerName}'s skill set unless it appears in the skills section above.
3. If asked about a specific technology that is NOT listed in the skills above, use more nuanced language like "As far as I know, ${developerName} hasn't worked with [technology] professionally" or "[Technology] doesn't appear to be one of ${developerName}'s core skills based on their profile." If you see similar technologies in their skill set, mention those, e.g., "While Angular isn't listed in ${developerName}'s profile, they do have strong experience with React and Svelte for building interactive web applications."
4. Do not explain what technologies are - assume the recruiter knows them.
5. Be balanced and realistic - you can be positive about ${developerName}'s skills but don't oversell. It's okay to acknowledge limitations or suggest the recruiter could discuss specific details with ${developerName} directly.
6. Always refer to the developer by name (${developerName}), not as "the developer".
7. When asked about specific years of experience with individual technologies, avoid giving exact numbers unless that information is explicitly provided. Instead, acknowledge the technology is in their skill set but suggest discussing specific timelines directly with the developer.

8. If the question is inappropriate, nonsensical, or not related to professional skills and experience, respond with a friendly deflection like: "I'm here to discuss ${developerName}'s professional skills and experience. That question seems a bit off-topic, but I'd be happy to tell you about their expertise in [mention a relevant skill from their profile]."

9. IMPORTANT: Your response should be a single, direct answer to the question. Do not include numbered examples, "Question:" or "Good response:" labels, or any meta-commentary about how you're answering. Just answer the question directly as if you're having a natural conversation.

10. The examples provided at the end of this prompt are ONLY to illustrate response style. The specific technologies mentioned in those examples are placeholders. You must ONLY mention technologies that are ACTUALLY listed in the developer's skills above.

Keep your response conversational, concise (around 150 words), and focused on the question asked.${relevantSkills.hasMatches ? '\nMake sure to emphasize the skills that match what the recruiter is looking for.' : ''}

/* 
IMPORTANT: The following examples are ONLY to illustrate response style. The specific technologies mentioned in these examples (like React, Svelte, Kafka, Angular) are PLACEHOLDERS. You must ONLY mention technologies that are ACTUALLY listed in the developer's skills above. DO NOT claim the developer has experience with any technology just because it appears in these examples.

Example 1: For questions about technologies not in the profile
Q: "Has ${developerName} worked with [Technology X]?"
A: "Based on what I know of ${developerName}'s background, [Technology X] doesn't appear in their core skill set. They've primarily focused on [technologies actually listed in their skills]. If you're specifically looking for [Technology X] experience, I'd suggest discussing this directly with ${developerName}."

Example 2: For questions about years of experience
Q: "How many years of experience does ${developerName} have with [Technology Y]?"
A: "From ${developerName}'s profile, I can see that [Technology Y] is among their key skills. While I don't have the exact number of years they've worked specifically with it, their overall experience includes building [relevant applications/systems] with [related technologies actually in their skill set]."

Example 3: For questions about alternative technologies
Q: "Has ${developerName} worked with [Technology Z]?"
A: "As far as I know, ${developerName} hasn't worked extensively with [Technology Z] professionally. Their expertise has been primarily focused on [actual technologies from their skill set], where they've built several sophisticated applications."

Example 4: For questions about overall experience
Q: "How experienced is ${developerName} as a developer?"
A: "${developerName} has ${developerData?.yearsOfExperience || 'several'} years of experience as a ${developerData?.title || 'developer'}, with particular expertise in [actual key skill areas from their profile]. Their background shows a solid foundation in [actual areas of expertise based on their skills]."
*/`;

    // For debugging - log the generated prompt
    console.log('Generated prompt:', prompt);

    return prompt;
  } catch (error) {
    console.error('Error generating dynamic prompt:', error);

    // Instead of using a fallback prompt with potentially outdated information,
    // we'll throw an error that will be caught in the generateAIResponse function
    throw new Error('Failed to generate prompt due to missing developer data');
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
 * Test function to verify the prompt generation
 * This can be called directly from the Lambda handler for testing
 * @param {string} question - Test question
 * @param {object} recruiterData - Optional test recruiter data
 * @returns {Promise<object>} - Test results
 */
export async function testPromptGeneration(
  question = 'What are your skills?',
  recruiterData = null
) {
  try {
    // Add a flag to track if we're using fallback data
    let usingFallbackData = false;
    console.log('Starting prompt generation test...');
    console.log('Developer table name:', process.env.DEVELOPER_TABLE_NAME);

    // Test developer data retrieval
    const developerData = await getDeveloperData();
    console.log('Developer data retrieved:', developerData ? 'Yes' : 'No');

    // If no developer data is found, this is a critical issue
    if (!developerData) {
      return {
        success: false,
        error: 'No developer data found',
        message:
          'The AI advocate service is currently unavailable because no developer profile data could be retrieved.',
        developerTableName: process.env.DEVELOPER_TABLE_NAME
      };
    }

    // If no recruiter data is provided, create a sample one for testing
    if (!recruiterData) {
      recruiterData = {
        linkId: 'test-link',
        recruiterName: 'Test Recruiter',
        companyName: 'Test Company',
        jobTitle: 'Senior Developer',
        jobDescription: 'Looking for an experienced developer with cloud skills',
        requiredSkills: ['AWS', 'React', 'Node.js'],
        preferredSkills: ['TypeScript', 'Serverless', 'Kafka'],
        companyIndustry: 'Technology',
        companySize: 'Medium',
        context: 'Expanding the development team for a new project'
      };
      console.log('Using sample recruiter data for testing');
    } else {
      console.log('Using provided recruiter data');
    }

    // Find relevant skills
    const relevantSkills = findRelevantSkills(recruiterData, developerData);
    console.log('Matching skills found:', relevantSkills.hasMatches ? 'Yes' : 'No');
    if (relevantSkills.hasMatches) {
      console.log('Matching skills:', relevantSkills.matchingSkills.map((m) => m.skill).join(', '));
    }

    // Generate a prompt
    const prompt = await generateDynamicPrompt(question, recruiterData);

    return {
      success: true,
      developerDataFound: !!developerData,
      developerTableName: process.env.DEVELOPER_TABLE_NAME,
      prompt,
      developerData: developerData
        ? {
            id: developerData.id,
            name: developerData.name,
            title: developerData.title,
            skillSetsCount: developerData.skillSets?.length || 0
          }
        : null,
      recruiterData: {
        name: recruiterData.recruiterName,
        company: recruiterData.companyName,
        jobTitle: recruiterData.jobTitle,
        skills: recruiterData.requiredSkills || recruiterData.preferredSkills || []
      },
      matchingSkills: relevantSkills.hasMatches
        ? relevantSkills.matchingSkills.map((m) => m.skill)
        : []
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
