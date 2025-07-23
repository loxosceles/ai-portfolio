# Architecture Overview

The AI Portfolio application follows a serverless architecture pattern with a static frontend and cloud-based backend services.

## System Architecture Diagram

```
┌─────────────────┐     ┌───────────────┐     ┌───────────────┐
│                 │     │               │     │               │
│    Recruiter    │────▶│  CloudFront   │────▶│  S3 Bucket    │
│                 │     │  Distribution │     │  (Frontend)   │
└─────────────────┘     └───────┬───────┘     └───────────────┘
                                │
                                ▼
┌─────────────────┐     ┌───────────────┐     ┌───────────────┐
│                 │     │               │     │               │
│  Lambda@Edge    │◀───▶│    Cognito    │     │    AppSync    │
│  (Auth)         │     │  User Pool    │     │  GraphQL API  │
└─────────────────┘     └───────────────┘     └───────┬───────┘
                                                      │
                                                      ▼
                                            ┌───────────────────┐
                                            │                   │
                                            │  Lambda Resolvers │
                                            │                   │
                                            └─────────┬─────────┘
                                                      │
                        ┌───────────────┐             │
                        │               │             │
                        │  AWS Bedrock  │◀────────────┘
                        │  (AI Models)  │
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │               │
                        │   DynamoDB    │
                        │   Tables      │
                        └───────────────┘
```

## Key Components

### Frontend

- **Next.js Static Site**: Hosted on S3, distributed via CloudFront
- **Apollo Client**: GraphQL client for data fetching
- **Auth Context**: Centralized authentication management

### Backend

- **AppSync API**: GraphQL API for data access
- **Lambda Resolvers**: Business logic for API operations
- **DynamoDB**: NoSQL database for data storage

### Authentication

- **Lambda@Edge**: Intercepts requests to handle authentication
- **Cognito**: Manages virtual users for personalized links
- **Cookie-based Auth**: Sets secure cookies for client-side auth

### AI Integration

- **AWS Bedrock**: Provides AI capabilities via Claude models
- **Model Adapters**: Abstract different AI model interfaces
- **Prompt Generation**: Creates context-aware prompts

## Core Workflows

### Personalized Link Flow

1. Generate unique link with visitor token
2. Store link data in DynamoDB with Cognito credentials
3. Share link with recruiter

### Authentication Flow

1. Recruiter clicks personalized link
2. Lambda@Edge intercepts request and validates token
3. Authentication cookies are set in the response
4. Frontend uses cookies for authenticated API requests

### AI Interaction Flow

1. Recruiter asks question through the interface
2. Question is sent to AppSync API with auth token
3. Lambda resolver generates context-aware prompt
4. AWS Bedrock generates personalized response
5. Response is returned to the frontend

## Detailed Documentation

- [Frontend Architecture](frontend.md)
- [Authentication Architecture](authentication.md)
- [AI Integration Architecture](ai-integration.md)
- [Infrastructure Architecture](infrastructure/overview.md)
