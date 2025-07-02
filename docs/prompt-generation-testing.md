# Testing the Dynamic Prompt Generation System

This document outlines how to test the dynamic prompt generation system implemented in Phase 1.

## Overview

The dynamic prompt generation system fetches developer profile data from DynamoDB and uses it to create personalized prompts for the AI advocate. To verify that this system is working correctly, we've added a special test endpoint that can be used to check the prompt generation without actually calling the AI model.

## Testing Approach

### 1. Deploy the Changes

First, deploy the changes to your development environment:

```bash
pnpm deploy:full:dev
```

This will update the Lambda function, add the necessary permissions, and create the test endpoint.

### 2. Use the GraphQL Test Endpoint

After deployment, you can test the prompt generation using the GraphQL API:

1. Open the AWS AppSync console
2. Navigate to your API (portfolio-api-dev)
3. Go to the Query tab
4. Run the following query:

```graphql
query TestPromptGeneration {
  testPromptGeneration(question: "What are your skills with AWS?") {
    success
    message
    details
  }
}
```

Make sure you're authenticated with a user that has access to the API.

### 3. Examine the Test Results

The test results will include:

- `success`: Whether the prompt generation was successful
- `message`: A summary message
- `details`: Detailed information including:
  - `developerDataFound`: Whether developer data was found in the DynamoDB table
  - `developerTableName`: The name of the developer table that was queried
  - `prompt`: The generated prompt
  - `developerData`: Basic information about the developer profile that was used

### 4. Check CloudWatch Logs

For more detailed debugging information, check the CloudWatch logs for the Lambda function:

1. Open the AWS CloudWatch console
2. Navigate to Log groups
3. Find the log group for the AI advocate function (`/aws/lambda/ai-advocate-dev`)
4. Look for recent log entries that include "Starting prompt generation test..."

The logs will show:

- Whether the developer table was found
- Whether developer data was retrieved
- The structure of the generated prompt

### 5. Test with Real Questions

Once you've verified that the prompt generation is working, you can test it with real questions using the regular AI advocate endpoint:

```graphql
query AskQuestion {
  askAIQuestion(question: "What are your skills with AWS?") {
    answer
    context
  }
}
```

Compare the responses with the previous hardcoded prompt to see if the dynamic prompt is providing more personalized and accurate responses.

## Troubleshooting

### Developer Data Not Found

If the test shows `developerDataFound: false`, check:

1. The developer table name in the environment variables
2. That the table contains developer profiles
3. That the Lambda function has permission to read from the table

### Permission Issues

If you see access denied errors in the logs:

1. Verify that the Lambda function has the correct IAM permissions
2. Check that the developer table name is correct
3. Make sure the table exists in the same region as the Lambda function

### Schema Issues

If the GraphQL query fails:

1. Verify that the schema was updated correctly
2. Check that the resolver was added to the API
3. Make sure you're authenticated with the correct user

## Next Steps

After confirming that Phase 1 is working correctly, we can proceed to Phase 2, which will enhance the prompt generation with better recruiter context integration.
