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
            } as DeveloperData
          });
        }
        return Promise.resolve({
          Items: [
            {
              id: 'project1',
              title: 'AI Portfolio',
              description: 'A serverless portfolio with AI features',
              tech: ['React', 'AWS', 'GraphQL'],
              highlights: ['Implemented RAG for personalized content']
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

// Mock utils.mjs
jest.mock('../../lib/functions/ai-advocate/utils.mjs', () => ({
  findRelevantSkills: jest.fn().mockImplementation(() => ({
    matchingSkills: [{ skill: 'React' }, { skill: 'TypeScript' }],
    hasMatches: true
  })),
  formatSkillsSection: jest
    .fn()
    .mockReturnValue(
      '- Frontend: React, TypeScript, Next.js\\n- Backend: Node.js, Express, AWS Lambda'
    ),
  formatProjectsSection: jest
    .fn()
    .mockReturnValue('- AI Portfolio: A serverless portfolio with AI features'),
  formatExperienceSection: jest
    .fn()
    .mockReturnValue(
      '- 8+ years of experience as a Full Stack Developer\\n- Passionate about building scalable web applications\\n- Based in Berlin, Germany'
    ),
  buildRulesSection: jest
    .fn()
    .mockReturnValue('Response Guidelines:\\nHigh Priority:\\n- Rule 1\\n- Rule 2')
}));

// Use dynamic import for ES modules
let promptGeneratorModule: PromptGeneratorModule;

describe('AI Advocate Prompt Generator', () => {
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

  test('should generate system prompt with developer name and rules', async () => {
    const question = 'What experience do you have with React?';
    const recruiterData: RecruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      jobTitle: 'Senior Frontend Developer',
      requiredSkills: ['React', 'TypeScript']
    };

    const result = await promptGeneratorModule.generateDynamicPrompt(question, recruiterData);

    // Verify system prompt contains developer name
    expect(result.systemPrompt).toContain('John Doe');

    // Verify system prompt contains rules
    expect(result.systemPrompt).toContain('Response Guidelines:');
  });

  test('should generate user prompt with recruiter context and question', async () => {
    const question = 'What experience do you have with React?';
    const recruiterData: RecruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      jobTitle: 'Senior Frontend Developer',
      requiredSkills: ['React', 'TypeScript']
    };

    const result = await promptGeneratorModule.generateDynamicPrompt(question, recruiterData);

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
    const recruiterData: RecruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      requiredSkills: ['TypeScript', 'React']
    };

    const result = await promptGeneratorModule.generateDynamicPrompt(question, recruiterData);

    // Verify matching skills are highlighted
    expect(result.userPrompt).toContain('===DEVELOPER_SKILLS===');
  });

  test('should include conversation history when available', async () => {
    const question = 'Can you elaborate more on your AWS experience?';
    const recruiterData: RecruiterData = {
      linkId: 'test-link',
      recruiterName: 'Jane Smith',
      companyName: 'Tech Corp',
      conversationHistory: [
        { role: 'user', content: 'What cloud platforms do you work with?' },
        { role: 'assistant', content: 'John primarily works with AWS.' },
        { role: 'user', content: 'What AWS services are you familiar with?' }
      ]
    };

    const result = await promptGeneratorModule.generateDynamicPrompt(question, recruiterData);

    // Verify conversation history is included
    expect(result.userPrompt).toContain('===CONVERSATION_HISTORY===');

    // Verify context mentions previous conversation
    expect(result.userPrompt).toContain('Previous conversation with 3 messages');
  });
});
