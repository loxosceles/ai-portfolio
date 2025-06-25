# AI-Enhanced Portfolio Implementation Plan

This document outlines the plan for implementing AI-powered features for recruiter interactions on the portfolio website.

## System Components

### 1. Greeting Modal

- Convert existing banner to a modal component in the application's style
- Display personalized greeting with recruiter's name and company
- Show introduction text that can either be:
  - Static text for now (Phase 1)
  - Pre-generated at link creation time (Phase 2)
  - Generated dynamically by AI (Phase 3)

### 2. AI Q&A System

- Button at the top of the portfolio page after the header
- Opens an input field for questions
- Answers questions using RAG system with context about:
  - Your skills and experience
  - The recruiter's company information
- Handles questions like "Why is Dev X well positioned for our team?" or "Has he worked with Kafka?"

## Implementation Phases

### Phase 1: Greeting Modal Conversion

1. Convert existing banner to a modal component
2. Use existing DynamoDB data for personalization
3. Implement static introduction text
4. Ensure proper styling consistent with the application

### Phase 2: AI Q&A System - Basic Version

1. Create Lambda function for handling questions
2. Implement GraphQL resolver for the AI Lambda
3. Create frontend Q&A component with input field
4. Connect frontend to GraphQL endpoint
5. Test with sample questions

### Phase 3: Enhanced AI System with RAG

1. Set up vector database for your portfolio information
2. Implement document ingestion pipeline for your skills and projects
3. Enhance Lambda to use RAG for answering specific questions
4. Improve answer quality with more context

## Technical Implementation Details

### Phase 1: Greeting Modal Conversion

#### 1. Frontend Modal Component

- Convert existing banner to a modal component
- Extract recruiter information from existing DynamoDB data
- Display personalized greeting with name and company
- Show static introduction text
- Add close button and animation effects

### Phase 2: AI Q&A System - Basic Version

#### 1. AI Lambda Function

- Create a new Lambda function that handles Q&A
- Extract recruiter information from authentication context
- Use Amazon Bedrock or another LLM service for generating answers
- Implement prompt engineering for natural-sounding responses

#### 2. GraphQL Schema Extension

```graphql
type AIAnswer {
  answer: String!
  context: String
}

extend type Query {
  askAIQuestion(question: String!): AIAnswer @aws_cognito_user_pools
}
```

#### 3. GraphQL Resolver

- Create resolver that connects to the AI Lambda
- Pass recruiter context and question to Lambda
- Return AI-generated answers

#### 4. Frontend Q&A Component

- Create React component for the Q&A interface
- Display input field for questions
- Show AI-generated answers
- Handle loading states and errors

## Detailed Implementation Plan

### Phase 1: Greeting Modal Conversion

1. **Create Modal Component**

   - File: `/frontend/components/RecruiterGreetingModal.tsx`
   - Convert existing banner to a modal
   - Extract recruiter data from existing source
   - Display personalized greeting with name and company
   - Include static introduction text
   - Add close button and animation effects

2. **Integrate Modal with Main Page**
   - Update relevant pages to show the modal for authenticated recruiters
   - Handle modal open/close state
   - Ensure proper styling and responsiveness

### Phase 2: AI Q&A System - Basic Version

1. **Create AI Lambda Function**

   - File: `/infrastructure/lib/functions/ai-qa/index.mjs`
   - Implement handler for answering questions
   - Use Amazon Bedrock for AI text generation
   - Extract recruiter information from authentication context
   - Format responses appropriately

2. **Update Infrastructure Stack**

   - File: `/infrastructure/lib/stacks/ai-qa-stack.ts`
   - Define Lambda function, IAM roles, and permissions
   - Connect to existing API Gateway
   - Add necessary environment variables

3. **Update GraphQL Schema**

   - File: `/infrastructure/lib/schema/schema.graphql`
   - Add new types and queries for AI Q&A
   - Configure proper authentication

4. **Create GraphQL Resolver**

   - File: `/infrastructure/lib/resolvers/ai-qa-resolver/index.mjs`
   - Implement resolver function for Q&A query
   - Connect to AI Lambda function

5. **Create Q&A Component**

   - File: `/frontend/components/AIQuestionAnswer.tsx`
   - Create input field for questions
   - Display AI-generated answers
   - Handle loading states and errors

6. **Connect Frontend to Backend**
   - Create GraphQL query for AI Q&A
   - Handle authentication and error states
   - Implement loading indicators

## Next Steps

1. Start with implementing the greeting modal component to replace the existing banner
2. Test the modal with existing recruiter data
3. Implement the AI Lambda function for Q&A
4. Create the frontend Q&A component
5. Test the end-to-end flow with sample questions
