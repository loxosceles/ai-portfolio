// AI Advocate Lambda function - Documentation: https://github.com/loxosceles/ai-portfolio/blob/main/docs/architecture/ai-integration.md

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ModelRegistry } from './adapters/model-registry.mjs';
import { generateDynamicPrompt, generateGreetingPrompt } from './prompt-generator.mjs';

// Configuration constants
const MAX_CONVERSATION_MESSAGES = 40; // Maximum number of messages to keep in conversation history

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Initialize Bedrock client for AI functionality
// Note: Bedrock availability varies by AWS account - ensure your account has access to Bedrock in eu-central-1
const bedrockClient = new BedrockRuntimeClient({ region: 'eu-central-1' }); // Using Bedrock in the same region as other backend services

// Default response object for advocate greeting
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
  // Ensure PROJECTS_TABLE_NAME is explicitly set
  if (!process.env.PROJECTS_TABLE_NAME) {
    throw new Error('Environment variable PROJECTS_TABLE_NAME must be set.');
  }

  // Extract field name to determine which operation to perform
  const fieldName = event.info.fieldName;

  try {
    switch (fieldName) {
      case 'getAdvocateGreeting':
        return await handleGetAdvocateGreeting(event);

      case 'askAIQuestion':
        return await handleAskAIQuestion(event);

      case 'resetConversation':
        return await handleResetConversation(event);

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

  // If no recruiter profile found, return default response
  // This should not happen in normal operation as the auth flow ensures
  // a recruiter profile exists for every valid link
  if (!recruiterData) {
    console.log(`No recruiter profile found for ${linkId}`);
    return createDefaultResponse(linkId);
  }

  try {
    // Generate AI greeting
    const aiGreeting = await generateAIGreeting(recruiterData);

    return {
      linkId: recruiterData.linkId,
      companyName: recruiterData.companyName,
      recruiterName: recruiterData.recruiterName,
      context: recruiterData.context,
      greeting: recruiterData.greeting,
      message: aiGreeting || recruiterData.message, // Use AI greeting if available, fallback to static
      skills: recruiterData.requiredSkills || recruiterData.preferredSkills || []
    };
  } catch (error) {
    console.error('Error generating AI greeting:', error);

    // Fallback to static content if AI generation fails
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
}

// handleGetAdvocateGreetingByLinkId function removed as it's not used by the frontend

async function handleAskAIQuestion(event) {
  const question = event.arguments?.question;

  if (!question) {
    return {
      answer: 'No question was provided.',
      context: 'Please provide a question to get a response.'
    };
  }

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
      // Create a default profile if one doesn't exist
      console.log('No recruiter profile found, creating default profile for linkId:', linkId);
      recruiterData = await createDefaultRecruiterProfile(linkId);
      console.log('Created default profile:', !!recruiterData);
    }
  }

  try {
    // Generate AI response with conversation context
    const answer = await generateAIResponse(question, recruiterData);

    // Save conversation history if we have recruiter data
    if (linkId && recruiterData) {
      console.log('Saving conversation for linkId:', linkId);
      console.log(
        'Current conversation history length:',
        recruiterData.conversationHistory?.length || 0
      );
      await saveConversationMessage(linkId, question, answer, recruiterData);
    } else {
      console.log(
        'Not saving conversation - linkId:',
        linkId,
        'recruiterData exists:',
        !!recruiterData
      );
    }

    return {
      answer,
      context: recruiterData
        ? `Response for ${recruiterData.recruiterName} from ${recruiterData.companyName}`
        : null
    };
  } catch (error) {
    console.error('Error in handleAskAIQuestion:', error);

    return {
      answer:
        'I apologize, but the AI advocate service is currently unavailable. Please try again later or contact support if this issue persists.',
      context: 'Service unavailable'
    };
  }
}

// getMatchingData function removed as it's no longer needed

// Get recruiter profile data from DynamoDB
async function getRecruiterProfile(linkId) {
  try {
    // Check if the recruiter profiles table name is set
    const tableName = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!tableName) {
      console.log('RECRUITER_PROFILES_TABLE_NAME not set, skipping recruiter profile lookup');
      return null;
    }

    console.log(`Fetching recruiter profile for linkId: ${linkId} from table: ${tableName}`);

    const command = new GetCommand({
      TableName: tableName,
      Key: { linkId }
    });

    const response = await docClient.send(command);

    if (response.Item) {
      console.log(`Found recruiter profile for ${linkId}`);
      console.log('Conversation history exists:', !!response.Item.conversationHistory);
      if (response.Item.conversationHistory) {
        console.log(`Conversation history length: ${response.Item.conversationHistory.length}`);
      }
      return response.Item;
    } else {
      console.log(`No recruiter profile found for linkId: ${linkId}`);
      return null;
    }
  } catch (error) {
    console.error('DynamoDB error when fetching recruiter profile:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return null;
  }
}

// Generate AI greeting using Amazon Bedrock
async function generateAIGreeting(recruiterData) {
  try {
    // Get model ID from environment variables
    const modelId = process.env.BEDROCK_MODEL_ID;
    if (!modelId) {
      throw new Error('BEDROCK_MODEL_ID environment variable is not set');
    }

    // Get the appropriate adapter for this model
    console.log('Using Bedrock model ID for greeting:', modelId);
    const adapter = ModelRegistry.getAdapter(modelId);

    // Generate greeting-specific prompt
    const promptData = await generateGreetingPrompt(recruiterData);

    // Format the payload using the adapter
    const payload = adapter.formatPrompt(promptData, {
      maxTokens: 150,
      temperature: 0.4, // Slightly higher temperature for more creative greetings
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
    console.error('AI greeting generation error:', error.message);
    console.error('Full error:', error);
    throw error; // Propagate error to be handled by the calling function
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
    console.log('Using Bedrock model ID:', modelId);
    const adapter = ModelRegistry.getAdapter(modelId);

    // Generate dynamic prompt based on developer profile and recruiter context
    const promptData = await generateDynamicPrompt(question, recruiterData);

    // Format the payload using the adapter, passing conversation history if available
    const payload = adapter.formatPrompt(
      promptData,
      {
        maxTokens: 150,
        temperature: 0.3,
        topP: 0.7
      },
      recruiterData?.conversationHistory
    );

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
    console.error('Full error:', error);

    // Check if this is a developer data issue
    if (
      error.message.includes('developer profile') ||
      error.message.includes('DEVELOPER_TABLE_NAME')
    ) {
      return `I apologize, but I cannot access my profile data right now. ${error.message} Please contact support if this issue persists.`;
    }

    // For other errors, provide a generic message
    return 'I apologize, but I encountered an error while processing your question. Please try again later or contact support if this issue persists.';
  }
}

// Save conversation message to recruiter profile
async function saveConversationMessage(linkId, question, answer, recruiterData) {
  try {
    const tableName = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!tableName) {
      console.log('RECRUITER_PROFILES_TABLE_NAME not set, skipping conversation save');
      return;
    }

    const now = Date.now();
    const conversationHistory = recruiterData.conversationHistory || [];

    // Add new messages to history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: question, timestamp: now },
      { role: 'assistant', content: answer, timestamp: now }
    ];

    // Trim history to prevent DynamoDB item size issues (20 exchanges = 40 messages)
    const trimmedHistory = updatedHistory.slice(-MAX_CONVERSATION_MESSAGES);

    console.log(`Saving ${trimmedHistory.length} messages to conversation history`);

    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: { linkId },
        UpdateExpression:
          'SET conversationHistory = :history, lastInteractionAt = :lastInteraction, conversationStartedAt = if_not_exists(conversationStartedAt, :started)',
        ExpressionAttributeValues: {
          ':history': trimmedHistory,
          ':lastInteraction': now,
          ':started': now
        }
      });

      await docClient.send(command);
      console.log('Conversation history saved successfully for linkId:', linkId);
      return true;
    } catch (dbError) {
      console.error('DynamoDB error saving conversation:', dbError);
      return false;
    }
  } catch (error) {
    console.error('Error in saveConversationMessage:', error);
    // Don't throw - conversation saving is not critical for the response
    return false;
  }
}

// Handle conversation reset
async function handleResetConversation(event) {
  const claims = event.identity?.claims;
  let linkId = claims?.['custom:linkId'] || claims?.sub;

  if (!linkId && typeof claims?.email === 'string') {
    linkId = claims.email.split('@')[0];
  }

  if (!linkId && typeof claims?.username === 'string') {
    linkId = claims.username.split('@')[0];
  }

  if (!linkId) {
    return false;
  }

  try {
    const tableName = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!tableName) {
      console.log('RECRUITER_PROFILES_TABLE_NAME not set, cannot reset conversation');
      return false;
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { linkId },
      UpdateExpression: 'REMOVE conversationHistory, lastInteractionAt, conversationStartedAt'
    });

    await docClient.send(command);
    console.log('Conversation reset for linkId:', linkId);
    return true;
  } catch (error) {
    console.error('Error resetting conversation:', error);
    return false;
  }
}

// Create a default recruiter profile
async function createDefaultRecruiterProfile(linkId) {
  try {
    console.log('Creating default recruiter profile for linkId:', linkId);

    const tableName = process.env.RECRUITER_PROFILES_TABLE_NAME;
    if (!tableName) {
      console.log('RECRUITER_PROFILES_TABLE_NAME not set, cannot create profile');
      return null;
    }

    // Create a basic profile with the minimum required fields
    const profile = {
      linkId,
      recruiterName: 'Recruiter',
      companyName: 'Company',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      conversationHistory: []
    };

    const command = new PutCommand({
      TableName: tableName,
      Item: profile
    });

    await docClient.send(command);
    console.log('Default recruiter profile created successfully');

    return profile;
  } catch (error) {
    console.error('Error creating default recruiter profile:', error);
    return null;
  }
}
