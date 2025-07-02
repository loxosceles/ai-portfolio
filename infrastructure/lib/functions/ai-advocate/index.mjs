import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ModelRegistry } from './adapters/model-registry.mjs';
import { generateDynamicPrompt, testPromptGeneration, isAppropriateQuestion } from './prompt-generator.mjs';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Initialize Bedrock client for AI functionality
// Note: Bedrock availability varies by AWS account - ensure your account has access to Bedrock in eu-central-1
const bedrockClient = new BedrockRuntimeClient({ region: 'eu-central-1' }); // Using Bedrock in the same region as other backend services

// Default response object for job matching
const createDefaultResponse = (linkId = 'unknown') => ({
  linkId,
  companyName: null,
  recruiterName: null,
  context: null,
  greeting: null,
  message: null,
  skills: null
});

export const handler = async (event) => {
  // Log the incoming event for debugging
  // console.log('Event:', JSON.stringify(event, null, 2));

  // Extract field name to determine which operation to perform
  const fieldName = event.info.fieldName;

  try {
    switch (fieldName) {
      case 'getAdvocateGreeting':
        return await handleGetAdvocateGreeting(event);

      case 'getAdvocateGreetingByLinkId':
        return await handleGetAdvocateGreetingByLinkId(event);

      case 'askAIQuestion':
        return await handleAskAIQuestion(event);
        
      case 'testPromptGeneration':
        return await handleTestPromptGeneration(event);

      default:
        throw new Error(`Unhandled field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);

    if (fieldName === 'askAIQuestion') {
      return {
        answer: 'Sorry, I encountered an error while processing your question.',
        context: error.message
      };
    }

    return createDefaultResponse('error');
  }
};

async function handleGetAdvocateGreeting(event) {
  // Extract linkId from JWT claims (AppSync context)
  const claims = event.identity?.claims;

  // Safely extract linkId with defensive checks
  let linkId = claims?.['custom:linkId'] || claims?.sub;

  // Only try to split if email/username exists and is a string
  if (!linkId && typeof claims?.email === 'string') {
    linkId = claims.email.split('@')[0];
  }

  if (!linkId && typeof claims?.username === 'string') {
    linkId = claims.username.split('@')[0];
  }

  if (!linkId) {
    return createDefaultResponse();
  }

  // Get recruiter profile data from DynamoDB
  const recruiterData = await getRecruiterProfile(linkId);
  
  // If no recruiter profile found, try the legacy table as fallback
  if (!recruiterData) {
    const tableName = process.env.MATCHING_TABLE_NAME;
    if (tableName) {
      const result = await getMatchingData(tableName, linkId);
      if (result) {
        console.log('Using legacy job matching data for greeting');
        return result;
      }
    }
    return createDefaultResponse(linkId);
  }
  
  // Convert RecruiterProfile to JobMatching format for backward compatibility
  return {
    linkId: recruiterData.linkId,
    companyName: recruiterData.companyName,
    recruiterName: recruiterData.recruiterName,
    context: recruiterData.context,
    greeting: recruiterData.greeting,
    message: recruiterData.message,
    skills: recruiterData.requiredSkills || recruiterData.preferredSkills || []
  };
}

async function handleGetAdvocateGreetingByLinkId(event) {
  const linkId = event.arguments?.linkId;

  if (!linkId) {
    return createDefaultResponse();
  }

  // Get recruiter profile data from DynamoDB
  const recruiterData = await getRecruiterProfile(linkId);
  
  // If no recruiter profile found, try the legacy table as fallback
  if (!recruiterData) {
    const tableName = process.env.MATCHING_TABLE_NAME;
    if (tableName) {
      const result = await getMatchingData(tableName, linkId);
      if (result) {
        console.log('Using legacy job matching data for greeting by linkId');
        return result;
      }
    }
    return createDefaultResponse(linkId);
  }
  
  // Convert RecruiterProfile to JobMatching format for backward compatibility
  return {
    linkId: recruiterData.linkId,
    companyName: recruiterData.companyName,
    recruiterName: recruiterData.recruiterName,
    context: recruiterData.context,
    greeting: recruiterData.greeting,
    message: recruiterData.message,
    skills: recruiterData.requiredSkills || recruiterData.preferredSkills || []
  };
}

async function handleAskAIQuestion(event) {
  const question = event.arguments?.question;

  if (!question) {
    return {
      answer: 'No question was provided.',
      context: 'Please provide a question to get a response.'
    };
  }
  
  // We're no longer pre-filtering questions at the Lambda level
  // The AI model will handle inappropriate questions with the instructions in the prompt

  // Extract linkId from JWT claims for context
  const claims = event.identity?.claims;
  let linkId = claims?.['custom:linkId'] || claims?.sub;

  if (!linkId && typeof claims?.email === 'string') {
    linkId = claims.email.split('@')[0];
  }

  if (!linkId && typeof claims?.username === 'string') {
    linkId = claims.username.split('@')[0];
  }

  // Get recruiter data for context - use only RecruiterProfiles table
  let recruiterData = null;
  if (linkId) {
    recruiterData = await getRecruiterProfile(linkId);
    
    if (recruiterData) {
      console.log('Using recruiter profile data for linkId:', linkId);
    }
  }

  try {
    // Generate AI response
    const answer = await generateAIResponse(question, recruiterData);

    return {
      answer,
      context: recruiterData
        ? `Response for ${recruiterData.recruiterName} from ${recruiterData.companyName}`
        : null
    };
  } catch (error) {
    console.error('Error in handleAskAIQuestion:', error);
    
    return {
      answer: 'I apologize, but the AI advocate service is currently unavailable. Please try again later or contact support if this issue persists.',
      context: 'Service unavailable'
    };
  }
}

/**
 * Handle test prompt generation request
 * This is a special endpoint for testing the prompt generation functionality
 */
async function handleTestPromptGeneration(event) {
  const question = event.arguments?.question || 'What are your skills?';
  
  // We're no longer pre-filtering questions at the Lambda level
  // The AI model will handle inappropriate questions with the instructions in the prompt
  
  // Extract linkId from JWT claims for context
  const claims = event.identity?.claims;
  let linkId = claims?.['custom:linkId'] || claims?.sub;
  
  if (!linkId && typeof claims?.email === 'string') {
    linkId = claims.email.split('@')[0];
  }
  
  if (!linkId && typeof claims?.username === 'string') {
    linkId = claims.username.split('@')[0];
  }
  
  // Get recruiter data for context - use only RecruiterProfiles table
  let recruiterData = null;
  if (linkId) {
    recruiterData = await getRecruiterProfile(linkId);
    
    if (recruiterData) {
      console.log('Using recruiter profile data for linkId:', linkId);
    } else {
      // For testing, create a sample recruiter profile if none exists
      recruiterData = {
        linkId: 'test-link',
        recruiterName: 'Test Recruiter',
        companyName: 'Test Company',
        jobTitle: 'Senior Cloud Developer',
        jobDescription: 'Looking for an experienced developer with strong AWS skills',
        requiredSkills: ['AWS', 'React', 'Node.js', 'TypeScript'],
        preferredSkills: ['CDK', 'Serverless', 'DynamoDB', 'Lambda'],
        companyIndustry: 'Technology',
        companySize: 'Medium (100-500 employees)',
        context: 'Expanding the development team for a new cloud project',
        greeting: 'Welcome to my portfolio!',
        message: 'Thank you for your interest in my work. I look forward to discussing how my skills align with your needs.'
      };
      console.log('Using sample recruiter profile for testing');
    }
  }
  
  try {
    // Run the test
    const testResults = await testPromptGeneration(question, recruiterData);
    
    return {
      success: testResults.success,
      message: testResults.success ? 'Prompt generation test successful' : 'Prompt generation test failed',
      details: testResults
    };
  } catch (error) {
    console.error('Error in handleTestPromptGeneration:', error);
    
    return {
      success: false,
      message: 'AI advocate service is currently unavailable',
      details: {
        error: error.message,
        serviceStatus: 'unavailable',
        recommendation: 'Please check that the developer profile data is properly loaded in DynamoDB.'
      }
    };
  }
}

// Get matching data from DynamoDB
async function getMatchingData(tableName, linkId) {
  try {
    const command = new GetCommand({
      TableName: tableName,
      Key: { linkId }
    });

    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error('DynamoDB error:', error);
    return null;
  }
}

// Get recruiter profile data from DynamoDB
async function getRecruiterProfile(linkId) {
  try {
    // Check if the recruiter profiles table name is set
    const tableName = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!tableName) {
      console.log('RECRUITER_PROFILES_TABLE_NAME not set, skipping recruiter profile lookup');
      return null;
    }
    
    const command = new GetCommand({
      TableName: tableName,
      Key: { linkId }
    });

    const response = await docClient.send(command);
    return response.Item;
  } catch (error) {
    console.error('DynamoDB error when fetching recruiter profile:', error);
    return null;
  }
}

// Generate AI response using Amazon Bedrock
async function generateAIResponse(question, recruiterData) {
  try {
    // Get model ID from environment variables
    const modelId = process.env.BEDROCK_MODEL_ID;
    if (!modelId) {
      throw new Error('BEDROCK_MODEL_ID environment variable is not set');
    }

    // Get the appropriate adapter for this model
    const adapter = ModelRegistry.getAdapter(modelId);
    
    // Generate dynamic prompt based on developer profile and recruiter context
    const prompt = await generateDynamicPrompt(question, recruiterData);
    
    // Log the prompt for debugging
    console.log('Using prompt:', prompt);

    // Format the payload using the adapter
    const payload = adapter.formatPrompt(prompt, {
      maxTokens: 300,
      temperature: 0.7,
      topP: 0.9
    });

    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(payload),
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Parse the response using the adapter
    return adapter.parseResponse(responseBody);
  } catch (error) {
    console.error('AI generation error:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        metadata: error.$metadata
      });
    }
    
    // Provide a clear message that the AI service is currently unavailable
    return 'I apologize, but the AI advocate service is currently unavailable. Our system couldn\'t access the necessary developer profile data to provide an accurate response. Please try again later or contact support if this issue persists.';
  }
}
