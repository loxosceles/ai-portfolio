
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { jest } from '@jest/globals';

// Mock AWS SDK clients
const dynamoDBMock = mockClient(DynamoDBClient);
const dynamoDBDocMock = mockClient(DynamoDBDocumentClient);

// Mock utils functions
jest.mock('../../lib/functions/ai-advocate/utils.mjs', () => ({
  findRelevantSkills: jest.fn().mockReturnValue({
    matchingSkills: [{ skill: 'React', type: 'exact' }],
    allDeveloperSkills: new Set(['React', 'Node.js', 'TypeScript']),
    recruiterSkills: ['React'],
    hasMatches: true
  }),
  formatSkillsSection: jest
    .fn()
    .mockReturnValue('- Frontend: React, TypeScript\\n- Backend: Node.js'),
  formatProjectsSection: jest.fn().mockReturnValue('- Portfolio Website: React, Next.js'),
  formatExperienceSection: jest.fn().mockReturnValue('- 5+ years of experience as a developer'),
  buildGreetingRulesSection: jest
    .fn()
    .mockReturnValue(
      'Greeting Guidelines:\\nHigh Priority:\\n- Create a warm, personalized greeting'
    ),
  buildRulesSection: jest
    .fn()
    .mockReturnValue('Response Guidelines:\\nHigh Priority:\\n- Rule 1\\n- Rule 2')
}));

// Use dynamic import for ES modules
let promptGeneratorModule;

describe('Greeting Prompt Generator', () => {
  beforeAll(async () => {
    // Dynamically import the module under test
    promptGeneratorModule = await import(
      '../../lib/functions/ai-advocate/prompt-generator.mjs'
    );
  });

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
        skillSets: [
          { name: 'Frontend', skills: ['React', 'TypeScript'] },
          { name: 'Backend', skills: ['Node.js', 'Express'] }
        ]
      }
    });

    dynamoDBDocMock.on(ScanCommand).resolves({
      Items: [
        {
          id: '1',
          title: 'Portfolio Website',
          tech: ['React', 'Next.js']
        }
      ]
    });

    // Mock environment variables
    process.env.DEVELOPER_TABLE_NAME = 'test-developer-table';
    process.env.PROJECTS_TABLE_NAME = 'test-projects-table';
  });

  test('should generate a greeting prompt with recruiter data', async () => {
    // Mock recruiter data
    const recruiterData = {
      linkId: 'test-link',
      companyName: 'Test Company',
      recruiterName: 'Jane Smith',
      context: 'Looking for a React developer',
      requiredSkills: ['React', 'TypeScript']
    };

    // Call the function
    const result = await promptGeneratorModule.generateGreetingPrompt(recruiterData);

    // Verify the result structure
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');

    // Verify system prompt content
    expect(result.systemPrompt).toContain('AI Advocate');
    expect(result.systemPrompt).toContain('John Doe');

    // Verify user prompt content
    expect(result.userPrompt).toContain('Test Company');
    expect(result.userPrompt).toContain('Jane Smith');
    expect(result.userPrompt).toContain('Looking for a React developer');
    expect(result.userPrompt).toContain('Create a personalized greeting');
  });

  test('should handle missing recruiter data gracefully', async () => {
    // Call with minimal recruiter data
    const minimalData = {
      linkId: 'minimal-link',
      companyName: 'Minimal Company',
      recruiterName: 'Minimal Recruiter'
    };

    const result = await promptGeneratorModule.generateGreetingPrompt(minimalData);

    // Verify the result still has the required structure
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');

    // Verify content still includes the minimal data
    expect(result.userPrompt).toContain('Minimal Company');
    expect(result.userPrompt).toContain('Minimal Recruiter');
  });
});
