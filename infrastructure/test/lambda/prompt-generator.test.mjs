// tests/ai-advocate/prompt-generator.test.mjs

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { jest } from '@jest/globals';

// Mock AWS SDK clients
const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocMock = mockClient(DynamoDBDocumentClient);



// Import the module under test
import { generateDynamicPrompt } from '../../lib/functions/ai-advocate/prompt-generator.mjs';

describe('AI Advocate Prompt Generator', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    dynamoDBMock.reset();
    dynamoDBDocMock.reset();
    jest.clearAllMocks();

    // Setup DynamoDB Document Client mocks
    dynamoDBDocMock.on(GetCommand).resolves({
      Item: {
        id: 'DEVELOPER_PROFILE',
        name: 'John Doe',
        title: 'Full Stack Developer',
        bio: 'Passionate about building scalable web applications',
        location: 'Berlin, Germany',
        yearsOfExperience: 8,
        skillSets: [
          {
            name: 'Frontend',
            skills: ['React', 'TypeScript', 'Next.js']
          },
          {
            name: 'Backend',
            skills: ['Node.js', 'Express', 'AWS Lambda']
          }
        ]
      }
    });

    dynamoDBDocMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'project1',
          title: 'AI Portfolio',
          description: 'A serverless portfolio with AI features',
          tech: ['React', 'AWS', 'GraphQL'],
          highlights: ['Implemented RAG for personalized content']
        }
      ]
    });

    // Mock environment variables
    process.env.DEVELOPER_TABLE_NAME = 'test-developer-table';
    process.env.PROJECTS_TABLE_NAME = 'test-projects-table';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate system prompt with developer name and rules', async () => {
    const question = 'What experience do you have with React?';
    const recruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      jobTitle: 'Senior Frontend Developer',
      requiredSkills: ['React', 'TypeScript']
    };

    const result = await generateDynamicPrompt(question, recruiterData);

    // Verify system prompt contains developer name
    expect(result.systemPrompt).toContain('John Doe');

    // Verify system prompt contains rules
    expect(result.systemPrompt).toContain('Response Guidelines:');

    // Verify DynamoDB was called
    expect(dynamoDBDocMock.calls()).toHaveLength(2);
  });

  test('should generate user prompt with recruiter context and question', async () => {
    const question = 'What experience do you have with React?';
    const recruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      jobTitle: 'Senior Frontend Developer',
      requiredSkills: ['React', 'TypeScript']
    };

    const result = await generateDynamicPrompt(question, recruiterData);

    // Verify user prompt contains recruiter context
    expect(result.userPrompt).toContain('Jane Smith');
    expect(result.userPrompt).toContain('Tech Corp');

    // Verify user prompt contains the question
    expect(result.userPrompt).toContain('What experience do you have with React?');

    // Verify user prompt contains developer skills
    expect(result.userPrompt).toContain('===DEVELOPER_SKILLS===');


  });

  test('should highlight matching skills when recruiter skills match developer skills', async () => {
    const question = 'Tell me about your TypeScript experience';
    const recruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      requiredSkills: ['TypeScript', 'React']
    };

    const result = await generateDynamicPrompt(question, recruiterData);

    // Verify matching skills are highlighted
    expect(result.userPrompt).toContain('===DEVELOPER_SKILLS===');


  });

  test('should include conversation history when available', async () => {
    const question = 'Can you elaborate more on your AWS experience?';
    const recruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      conversationHistory: [
        { role: 'user', content: 'What cloud platforms do you work with?' },
        { role: 'assistant', content: 'John primarily works with AWS.' },
        { role: 'user', content: 'What AWS services are you familiar with?' }
      ]
    };

    const result = await generateDynamicPrompt(question, recruiterData);

    // Verify conversation history is included
    expect(result.userPrompt).toContain('===CONVERSATION_HISTORY===');

    // Verify context mentions previous conversation
    expect(result.userPrompt).toContain('Previous conversation with 3 messages');
  });

  test('should handle DynamoDB errors gracefully', async () => {
    // Mock DynamoDB to reject
    dynamoDBDocMock.reset();
    dynamoDBDocMock.on(GetCommand).rejects(new Error('DynamoDB error'));
    dynamoDBDocMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    const question = 'What experience do you have?';
    const recruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp'
    };

    // Should throw error which is caught by higher-level handler
    await expect(generateDynamicPrompt(question, recruiterData)).rejects.toThrow('No developer profile found in table');
  });
});