# Recruiter Profile Schema

This document outlines the RecruiterProfile schema used for both the greeting modal and AI advocate feature.

## RecruiterProfile Schema

```typescript
interface RecruiterProfile {
  linkId: string; // Primary key - unique identifier for the link
  recruiterName: string; // Name of the recruiter
  companyName: string; // Company name
  jobTitle?: string; // Job title they're recruiting for
  jobDescription?: string; // Brief description of the position
  requiredSkills?: string[]; // Skills required for the job
  preferredSkills?: string[]; // Skills that are nice to have
  companyIndustry?: string; // Industry the company operates in
  companySize?: string; // Size of the company (small, medium, large)
  greeting?: string; // Personalized greeting (can be generated)
  message?: string; // Additional message for the greeting
  context?: string; // Additional context about the recruiter/company
  createdAt?: number; // When the profile was created
  updatedAt?: number; // When the profile was last updated
  metadata?: Record<string, any>; // Additional metadata for future expansion
}
```

## Implementation Notes

### Table Structure

The RecruiterProfiles table is structured as follows:

- **Table Name**: `RecruiterProfiles-${stage}`
- **Partition Key**: `linkId` (string)
- **Billing Mode**: Pay-per-request

### Usage

The RecruiterProfile data is used for two main features:

1. **AI Advocate Greeting**: Displays a personalized greeting from the AI advocate when a recruiter visits the portfolio

   - Uses the `greeting` and `message` fields to welcome the recruiter
   - Accessed via the `getAdvocateGreeting` and `getAdvocateGreetingByLinkId` queries
   - Also accessible via legacy queries `getJobMatching` and `getJobMatchingByLinkId` for backward compatibility

2. **AI Advocate**: Generates personalized prompts for the AI model
   - Uses recruiter information, job details, and skills
   - Accessed via the `askAIQuestion` query (requires authentication)

### Authentication

- **Greeting and Job Matching**: Requires Cognito user pool authentication (invisible login)
- **AI Questions**: Requires Cognito user pool authentication (invisible login)
- **Test Prompt Generation**: Allows both API key and Cognito authentication (for testing)

### Manual Data Entry

You can manually create entries in the RecruiterProfile table with:

1. Basic information:

   - `linkId`: Unique identifier for the link
   - `recruiterName`: Name of the recruiter
   - `companyName`: Company name

2. Greeting information:

   - `greeting`: Personalized greeting message
   - `message`: Additional message for the greeting

3. Job-specific information:

   - `jobTitle`: Position they're recruiting for
   - `jobDescription`: Brief description of the job
   - `requiredSkills`: Array of required skills
   - `preferredSkills`: Array of preferred skills

4. Company information:

   - `companyIndustry`: Industry the company operates in
   - `companySize`: Size of the company (small, medium, large)

5. Additional context:
   - `context`: Any additional context about the recruiter or company
   - `metadata`: Any other information that doesn't fit elsewhere

### Test Profile Creation

You can create a test recruiter profile using the provided script:

```bash
node infrastructure/scripts/create-test-recruiter-profile.mjs --stage dev --linkId test-link
```

### Data Migration

To migrate greeting data from the legacy JobMatching table to the RecruiterProfiles table:

```bash
node infrastructure/scripts/migrate-greeting-data.mjs --stage dev
```

### Testing

You can test the prompt generation using the `testPromptGeneration` endpoint:

```graphql
query TestPromptGeneration {
  testPromptGeneration(question: "What experience do you have with AWS and cloud architecture?") {
    success
    message
    details
  }
}
```

## Next Steps

1. Create a UI for managing RecruiterProfiles
2. Implement automated data enrichment for company and job information
3. Add analytics to track prompt effectiveness
4. Implement A/B testing for different prompt structures
5. Decommission the legacy JobMatching table after confirming all functionality works with RecruiterProfiles
