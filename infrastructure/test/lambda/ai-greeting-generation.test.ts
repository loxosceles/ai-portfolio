import {
  IAdvocateGreetingResponse,
  IAIAnswerResponse,
  IAppSyncEvent
} from '../../types/data/advocate';

// Define a more specific module type that matches our current implementation
interface AIAdvocateModule {
  handler: (
    event: IAppSyncEvent
  ) => Promise<IAdvocateGreetingResponse | IAIAnswerResponse | boolean>;
}

// Mock the global TextDecoder
class MockTextDecoder {
  decode(buffer: Uint8Array | ArrayBuffer): string {
    return JSON.stringify({ completion: 'Mocked response' });
  }
}
global.TextDecoder = MockTextDecoder as unknown as typeof TextDecoder;

// Mock dependencies
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command) => {
        if (command.constructor.name === 'GetCommand') {
          return Promise.resolve({
            Item: {
              linkId: 'test-link',
              companyName: 'Test Company',
              recruiterName: 'Jane Smith',
              context: 'Looking for a React developer',
              requiredSkills: ['React', 'TypeScript'],
              message: 'Static fallback message'
            }
          });
        }
        return Promise.resolve({});
      })
    }))
  },
  GetCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'GetCommand' },
    ...params
  })),
  UpdateCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'UpdateCommand' },
    ...params
  })),
  PutCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'PutCommand' },
    ...params
  }))
}));

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation(() => ({
      body: Buffer.from(
        JSON.stringify({
          completion:
            "Welcome to my portfolio! I noticed you're from Test Company. I have experience with React which aligns with your needs."
        })
      )
    }))
  })),
  InvokeModelCommand: jest.fn().mockImplementation((params) => ({
    ...params
  }))
}));

jest.mock('../../lib/functions/ai-advocate/adapters/model-registry.mjs', () => ({
  ModelRegistry: {
    getAdapter: jest.fn().mockReturnValue({
      formatPrompt: jest.fn().mockReturnValue({ prompt: 'test prompt' }),
      parseResponse: jest.fn().mockImplementation((response) => response.completion)
    })
  }
}));

jest.mock('../../lib/functions/ai-advocate/prompt-generator.mjs', () => ({
  generateGreetingPrompt: jest.fn().mockResolvedValue({
    systemPrompt: 'You are an AI Advocate',
    userPrompt: 'Create a greeting for Jane from Test Company'
  }),
  generateDynamicPrompt: jest.fn().mockResolvedValue({
    systemPrompt: 'You are an AI Advocate',
    userPrompt: 'Answer a question for Jane from Test Company'
  })
}));

// Use dynamic import for ES modules
let aiAdvocateHandler: AIAdvocateModule;

describe('AI Greeting Generation', () => {
  beforeAll(async () => {
    // Dynamically import the module under test and use type assertion
    aiAdvocateHandler = (await import(
      '../../lib/functions/ai-advocate/index.mjs'
    )) as unknown as AIAdvocateModule;
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Set environment variables
    process.env.BEDROCK_MODEL_ID = 'anthropic.claude-v2';
    process.env.PROJECTS_TABLE_NAME = 'test-projects-table';
    process.env.RECRUITER_PROFILES_TABLE_NAME = 'test-recruiter-profiles-table';
    process.env.MATCHING_TABLE_NAME = 'test-matching-table';
  });

  test('should handle getAdvocateGreeting request', async () => {
    // Mock event
    const mockEvent: IAppSyncEvent = {
      info: { fieldName: 'getAdvocateGreeting' },
      identity: {
        claims: {
          'custom:linkId': 'test-link',
          email: 'jane@testcompany.com'
        }
      }
    };

    // Call the handler
    const result = (await aiAdvocateHandler.handler(mockEvent)) as IAdvocateGreetingResponse;

    // Verify the result
    expect(result).toHaveProperty('linkId');
    expect(result).toHaveProperty('companyName');
    expect(result).toHaveProperty('recruiterName');
  });
});
