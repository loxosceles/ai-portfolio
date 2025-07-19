import { PromptGeneratorModule, RecruiterData, DeveloperData, ProjectData } from '../types';

// Mock AWS SDK modules
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
              id: 'DEVELOPER_PROFILE',
              name: 'John Doe',
              title: 'Full Stack Developer',
              skillSets: [
                { name: 'Frontend', skills: ['React', 'TypeScript'] },
                { name: 'Backend', skills: ['Node.js', 'Express'] }
              ]
            } as DeveloperData
          });
        }
        return Promise.resolve({
          Items: [
            {
              id: '1',
              title: 'Portfolio Website',
              tech: ['React', 'Next.js']
            } as ProjectData
          ]
        });
      })
    }))
  },
  GetCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'GetCommand' },
    ...params
  })),
  ScanCommand: jest.fn().mockImplementation((params) => ({
    constructor: { name: 'ScanCommand' },
    ...params
  }))
}));

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
let promptGeneratorModule: PromptGeneratorModule;

describe('Greeting Prompt Generator', () => {
  beforeAll(async () => {
    // Dynamically import the module under test
    promptGeneratorModule = (await import(
      '../../lib/functions/ai-advocate/prompt-generator.mjs'
    )) as PromptGeneratorModule;
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock environment variables
    process.env.DEVELOPER_TABLE_NAME = 'test-developer-table';
    process.env.PROJECTS_TABLE_NAME = 'test-projects-table';
  });

  test('should generate a greeting prompt with recruiter data', async () => {
    // Mock recruiter data
    const recruiterData: RecruiterData = {
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
    const minimalData: RecruiterData = {
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
