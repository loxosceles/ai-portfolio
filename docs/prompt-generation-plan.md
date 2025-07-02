# Dynamic Prompt Generation System

This document outlines the plan for implementing a dynamic prompt generation system for the AI advocate feature.

## Current State

Currently, the AI advocate feature uses a hardcoded prompt in the `generateAIResponse` function in `index.mjs`:

```javascript
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
```

This approach has several limitations:

- Developer information is hardcoded and cannot be updated without code changes
- No way to tailor responses based on specific skills or experiences
- No integration with the existing developer profile data

## Proposed Solution

We'll implement a dynamic prompt generation system that:

1. Uses the existing developer profile data from the developer table
2. Integrates with the job matching table for recruiter context
3. Dynamically generates prompts based on the latest developer information
4. Optimizes for performance by minimizing latency

## Implementation Plan

### Step 1: Update AI Advocate Resolver to Access Developer Data

Modify the `AIAdvocateResolverConstruct` to grant access to the developer table:

```typescript
// In ai-advocate-resolver-construct.ts
export interface AIAdvocateResolverProps {
  api: appsync.GraphqlApi;
  jobMatchingTable: dynamodb.ITable;
  developerTable: dynamodb.ITable; // Add this
  stage: string;
  bedrockModelId?: string;
}

// In the constructor
this.function = new lambda.Function(this, 'AIAdvocateFunction', {
  // ...existing config
  environment: {
    MATCHING_TABLE_NAME: props.jobMatchingTable.tableName,
    DEVELOPER_TABLE_NAME: props.developerTable.tableName, // Add this
    BEDROCK_MODEL_ID: props.bedrockModelId
  }
  // ...
});

// Grant read access to developer table
props.developerTable.grantReadData(this.function);
```

### Step 2: Create Prompt Generation Module

Create a new module for prompt generation in the AI advocate function:

```javascript
// In /infrastructure/lib/functions/ai-advocate/prompt-generator.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const dynamodb = new DynamoDBClient({ region: 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamodb);

/**
 * Generates a dynamic prompt based on developer profile and recruiter context
 * @param {string} question - The question asked by the recruiter
 * @param {object} recruiterData - Data about the recruiter from the job matching table
 * @returns {string} - The generated prompt
 */
export async function generateDynamicPrompt(question, recruiterData) {
  // Get developer profile data
  const developerData = await getDeveloperData();

  // Create recruiter context section
  let recruiterContext = '';
  if (recruiterData) {
    recruiterContext = `
      You are responding to ${recruiterData.recruiterName} from ${recruiterData.companyName}.
      Their context is: ${recruiterData.context || 'Not specified'}
      Skills they might be interested in: ${recruiterData.skills?.join(', ') || 'Not specified'}
    `;
  }

  // Format skills section
  const skillsSection = formatSkillsSection(developerData);

  // Format experience section
  const experienceSection = formatExperienceSection(developerData);

  // Combine everything into a prompt
  return `
    ${recruiterContext}
    
    You are an AI Advocate representing a developer in a conversation with a recruiter.
    Answer the following question about the developer's skills, experience, or background:
    
    Question: "${question}"
    
    Use the following information about the developer to provide an accurate, helpful response:
    ${skillsSection}
    ${experienceSection}
    
    Keep your response professional, concise (around 150 words), and focused on the question asked.
  `;
}

/**
 * Gets developer data from the DynamoDB table
 * @returns {object} - Developer profile data
 */
async function getDeveloperData() {
  try {
    const tableName = process.env.DEVELOPER_TABLE_NAME;

    // For now, we'll scan the table to get all developer data
    // In a future iteration, we could use a specific ID or filter
    const command = new ScanCommand({
      TableName: tableName,
      Limit: 10 // Assuming we have a small number of developer profiles
    });

    const response = await docClient.send(command);

    // Return the first active developer profile or the first profile if none are marked active
    const activeProfile = response.Items?.find((item) => item.isActive === true);
    return activeProfile || response.Items?.[0] || null;
  } catch (error) {
    console.error('Error fetching developer data:', error);
    return null;
  }
}

/**
 * Formats the skills section of the prompt
 * @param {object} developerData - Developer profile data
 * @returns {string} - Formatted skills section
 */
function formatSkillsSection(developerData) {
  if (!developerData || !developerData.skillSets) {
    return '- Full-stack developer with experience in web development';
  }

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

  return `- ${developerData.yearsOfExperience}+ years of experience as a ${developerData.title}
- ${developerData.bio || 'Experienced developer with a passion for quality code'}`;
}
```

### Step 3: Update the AI Advocate Function

Modify the AI advocate function to use the dynamic prompt generator:

```javascript
// In index.mjs
import { generateDynamicPrompt } from './prompt-generator.mjs';

// Update the generateAIResponse function
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

    // Format the payload using the adapter
    const payload = adapter.formatPrompt(prompt, {
      maxTokens: 300,
      temperature: 0.7,
      topP: 0.9
    });

    // Rest of the function remains the same
    // ...
  } catch (error) {
    // Error handling
    // ...
  }
}
```

### Step 4: Update Stack to Pass Developer Table

Update the API stack to pass the developer table to the AI advocate resolver:

```typescript
// In api-stack.ts or wherever the AI advocate resolver is created
const developerTable = this.getOrCreateDeveloperTable();

const aiAdvocateResolver = new AIAdvocateResolverConstruct(this, 'AIAdvocateResolver', {
  api,
  jobMatchingTable: this.jobMatchingTable,
  developerTable, // Add this
  stage,
  bedrockModelId: props.bedrockModelId
});

// Helper method to get or create the developer table
private getOrCreateDeveloperTable(): dynamodb.Table {
  // Check if the table already exists as a construct in this stack
  const existingTable = this.node.tryFindChild('DeveloperTable') as dynamodb.Table;
  if (existingTable) {
    return existingTable;
  }

  // If not, create it
  return new dynamodb.Table(this, 'DeveloperTable', {
    tableName: `Developer-${this.stage}`,
    partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: this.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    deletionProtection: this.stage === 'prod'
  });
}
```

## Future Enhancements

### Phase 2: Recruiter Context Integration

In the second phase, we'll enhance the prompt generation to better utilize recruiter context:

1. Analyze the recruiter's company and skills of interest
2. Tailor the prompt to emphasize relevant developer skills
3. Include specific examples of projects or experiences that match the recruiter's interests

### Phase 3: Prompt Caching

To further optimize performance:

1. Implement a caching mechanism for frequently used prompt components
2. Pre-compute base prompts during deployment or on developer profile updates
3. Add versioning to prompts to track changes over time

## Benefits

- **Dynamic Content**: Developer information can be updated without code changes
- **Personalized Responses**: Responses tailored to both the developer profile and recruiter context
- **Improved Accuracy**: More comprehensive developer information leads to better AI responses
- **Maintainability**: Separation of prompt generation logic from the main function
- **Performance**: Optimized for low latency through efficient data access

## Cost Analysis

This implementation has minimal cost impact:

- Additional DynamoDB read operations: ~$0.25 per million reads
- No additional infrastructure required
- Negligible increase in Lambda execution time
