import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { jest } from '@jest/globals';

// Mock AWS SDK clients
const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocMock = mockClient(DynamoDBDocumentClient);
const bedrockMock = mockClient(BedrockRuntimeClient);

// Mock the global TextDecoder
class MockTextDecoder {
  decode() {
    return JSON.stringify({ completion: 'Mocked response' });
  }
}
global.TextDecoder = MockTextDecoder;

// Use dynamic import for ES modules
let aiAdvocateHandler;

describe('AI Greeting Generation', () => {
  beforeAll(async () => {
    // Dynamically import the module under test
    aiAdvocateHandler = await import('../../lib/functions/ai-advocate/index.mjs');
  });

  beforeEach(() => {
    // Reset all mocks before each test
    dynamoDBMock.reset();
    dynamoDBDocMock.reset();
    bedrockMock.reset();
    jest.clearAllMocks();

    // Setup mocks
    dynamoDBDocMock.on(GetCommand).resolves({
      Item: {
        linkId: 'test-link',
        companyName: 'Test Company',
        recruiterName: 'Jane Smith',
        context: 'Looking for a React developer',
        requiredSkills: ['React', 'TypeScript'],
        message: 'Static fallback message'
      }
    });

    bedrockMock.on(InvokeModelCommand).resolves({
      body: Buffer.from(
        JSON.stringify({
          completion: "Welcome to my portfolio! I noticed you're from Test Company. I have experience with React which aligns with your needs."
        })
      )
    });

    // Set environment variables
    process.env.BEDROCK_MODEL_ID = 'anthropic.claude-v2';
    process.env.PROJECTS_TABLE_NAME = 'test-projects-table';
    process.env.RECRUITER_PROFILES_TABLE_NAME = 'test-recruiter-profiles-table';
  });

  test('should handle getAdvocateGreeting request', async () => {
    // Mock event
    const mockEvent = {
      info: { fieldName: 'getAdvocateGreeting' },
      identity: {
        claims: {
          'custom:linkId': 'test-link',
          email: 'jane@testcompany.com'
        }
      }
    };

    // Call the handler
    const result = await aiAdvocateHandler.handler(mockEvent);

    // Verify the result
    expect(result).toHaveProperty('linkId');
    expect(result).toHaveProperty('companyName');
    expect(result).toHaveProperty('recruiterName');
  });
});
