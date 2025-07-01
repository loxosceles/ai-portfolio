# Recruiter Profile Schema

This document outlines the RecruiterProfile schema used for the AI advocate feature.

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

### Usage in AI Advocate

The AI advocate feature uses the RecruiterProfile data to generate personalized prompts for the AI model. The prompt includes:

- Recruiter information (name, company)
- Job details (title, description)
- Company information (industry, size)
- Required and preferred skills

This information is used to tailor the AI responses to the specific recruiter and job opportunity.

### Manual Data Entry

You can manually create entries in the RecruiterProfile table with:

1. Basic information:

   - `linkId`: Unique identifier for the link
   - `recruiterName`: Name of the recruiter
   - `companyName`: Company name

2. Job-specific information:

   - `jobTitle`: Position they're recruiting for
   - `jobDescription`: Brief description of the job
   - `requiredSkills`: Array of required skills
   - `preferredSkills`: Array of preferred skills

3. Company information:

   - `companyIndustry`: Industry the company operates in
   - `companySize`: Size of the company (small, medium, large)

4. Additional context:
   - `context`: Any additional context about the recruiter or company
   - `metadata`: Any other information that doesn't fit elsewhere

### Test Profile Creation

You can create a test recruiter profile using the provided script:

```bash
node infrastructure/scripts/create-test-recruiter-profile.mjs --stage dev --linkId test-link
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

This will use a sample RecruiterProfile with the new schema fields to generate a prompt.

## Next Steps

1. Create a UI for managing RecruiterProfiles
2. Implement automated data enrichment for company and job information
3. Add analytics to track prompt effectiveness
4. Implement A/B testing for different prompt structures
