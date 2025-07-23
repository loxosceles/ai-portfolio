# AI Portfolio

## Overview

A serverless application that creates personalized professional portfolio experiences for recruiters through:

- **Personalized Access Links**: Unique links with AI-generated personalized greetings for recruiters
- **"Invisible" Authentication**: Seamless authentication via CloudFront and Lambda@Edge without requiring login
- **AI-Powered Interaction**: Personalized responses to recruiter questions using AWS Bedrock
- **Cost-optimized AWS Serverless Infrastructure**: Leveraging S3, CloudFront, Lambda, AppSync, and DynamoDB

## Architecture

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

## Key Features

✅ **Personalized Recruiter Experience**

- Unique access links for each recruiter with personalized content
- AI-generated greetings tailored to the recruiter's company and role
- Contextual responses based on recruiter profile and job requirements

✅ **AI Advocate**

- AI speaks in third-person as an advocate for the portfolio owner
- Answers recruiter questions about skills, experience, and projects
- Maintains conversation history for contextual follow-up questions

✅ **Serverless Architecture**

- Static Next.js frontend hosted on S3 with CloudFront distribution
- GraphQL API with AppSync and Lambda resolvers
- DynamoDB for data storage
- AWS Bedrock for AI capabilities

## Tech Stack

| Layer          | Technologies                                       |
| -------------- | -------------------------------------------------- |
| Frontend       | Next.js, TypeScript, Tailwind CSS, Apollo Client   |
| Backend        | AWS Lambda, AppSync, CloudFront, Cognito, DynamoDB |
| AI Integration | AWS Bedrock with Claude models                     |
| Infrastructure | AWS CDK, TypeScript                                |

## Core Workflows

1. **Link Generation**: Creates personalized URLs with tokens for recruiters
2. **Authentication Flow**: Lambda@Edge intercepts requests, validates tokens, and sets auth cookies
3. **Frontend Experience**: Next.js frontend with Apollo client uses auth tokens for personalized content
4. **AI Interaction**: AWS Bedrock provides AI capabilities for personalized interactions

## Documentation

Comprehensive documentation is available in the [docs](docs/README.md) directory.

Key documentation sections:

- [Architecture & Implementation](docs/README.md#architecture)
- [Deployment & Operations](docs/README.md#guides)
- [Reference](docs/README.md#reference)
- [Contributing](docs/README.md#contributing)
