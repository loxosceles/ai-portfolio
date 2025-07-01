import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ModelRegistry } from './adapters/model-registry.mjs';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

// Initialize Bedrock client for AI functionality
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
      case 'getJobMatching':
        return await handleGetJobMatching(event);

      case 'getJobMatchingByLinkId':
        return await handleGetJobMatchingByLinkId(event);

      case 'askAIQuestion':
        return await handleAskAIQuestion(event);

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

async function handleGetJobMatching(event) {
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

  // Get matching data from DynamoDB
  const tableName = process.env.MATCHING_TABLE_NAME;
  const result = await getMatchingData(tableName, linkId);

  // Return the result or a default response with the linkId
  return result || createDefaultResponse(linkId);
}

async function handleGetJobMatchingByLinkId(event) {
  const linkId = event.arguments?.linkId;

  if (!linkId) {
    return createDefaultResponse();
  }

  // Get matching data from DynamoDB
  const tableName = process.env.MATCHING_TABLE_NAME;
  const result = await getMatchingData(tableName, linkId);

  // Return the result or a default response with the linkId
  return result || createDefaultResponse(linkId);
}

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

  // Get recruiter data for context
  let recruiterData = null;
  if (linkId) {
    const tableName = process.env.MATCHING_TABLE_NAME;
    recruiterData = await getMatchingData(tableName, linkId);
  }

  // Generate AI response
  const answer = await generateAIResponse(question, recruiterData);

  return {
    answer,
    context: recruiterData
      ? `Response for ${recruiterData.recruiterName} from ${recruiterData.companyName}`
      : null
  };
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

// Generate AI response using Amazon Bedrock
async function generateAIResponse(question, recruiterData) {
  try {
    // Create context for the AI based on recruiter data
    let context = '';
    if (recruiterData) {
      context = `
        You are responding to ${recruiterData.recruiterName} from ${recruiterData.companyName}.
        Their context is: ${recruiterData.context || 'Not specified'}
        Skills they might be interested in: ${recruiterData.skills?.join(', ') || 'Not specified'}
      `;
    }

    // Get model ID from environment variables
    const modelId = process.env.BEDROCK_MODEL_ID;
    if (!modelId) {
      throw new Error('BEDROCK_MODEL_ID environment variable is not set');
    }

    // Get the appropriate adapter for this model
    const adapter = ModelRegistry.getAdapter(modelId);

    const prompt = `
      ${context}
      
      You are an AI Advocate representing a developer in a conversation with a recruiter.
      Answer the following question about the developer's skills, experience, or background:
      
      Question: "${question}"
      
      Use the following information about the developer to provide an accurate, helpful response:
      - Full-stack developer with experience in React, Node.js, and AWS
      - 5+ years of experience building web applications
      - Experience with cloud architecture, particularly with AWS services
      - Strong background in serverless architectures and microservices
      - Passionate about clean code, performance optimization, and user experience
      
      Keep your response professional, concise (around 150 words), and focused on the question asked.
    `;

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
    console.error('AI generation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      metadata: error.$metadata
    });
    return 'Sorry, I could not generate a response at this time. Please try again later.';
  }
}
