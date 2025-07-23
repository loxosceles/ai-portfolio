# AI Portfolio Documentation

Welcome to the AI Portfolio documentation. This guide will help you understand, deploy, and contribute to the AI Portfolio application.

## Documentation Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        AI Portfolio Documentation                   │
│                                                                     │
├───────────────┬───────────────┬────────────────┬───────────────────┤
│               │               │                │                   │
│  Architecture │    Guides     │   Reference    │   Contributing    │
│               │               │                │                   │
├───────────────┼───────────────┼────────────────┼───────────────────┤
│ ┌───────────┐ │ ┌───────────┐ │ ┌────────────┐ │ ┌───────────────┐ │
│ │ Overview  │ │ │ Deployment│ │ │ Environment│ │ │ Development   │ │
│ └───────────┘ │ └───────────┘ │ │ Variables  │ │ │ Workflow      │ │
│               │               │ └────────────┘ │ └───────────────┘ │
│ ┌───────────┐ │ ┌───────────┐ │                │                   │
│ │ Frontend  │ │ │ Local Dev │ │ ┌────────────┐ │ ┌───────────────┐ │
│ └───────────┘ │ └───────────┘ │ │ Commands   │ │ │ Testing       │ │
│               │               │ └────────────┘ │ └───────────────┘ │
│ ┌───────────┐ │ ┌───────────┐ │                │                   │
│ │ Auth      │ │ │ Trouble-  │ │ ┌────────────┐ │ ┌───────────────┐ │
│ └───────────┘ │ │ shooting  │ │ │ Config     │ │ │ Code Style    │ │
│               │ └───────────┘ │ └────────────┘ │ └───────────────┘ │
│ ┌───────────┐ │               │                │                   │
│ │ AI        │ │ ┌───────────┐ │                │                   │
│ │ Integration│ │ │ Security  │ │                │                   │
│ └───────────┘ │ └───────────┘ │                │                   │
│               │               │                │                   │
│ ┌───────────┐ │               │                │                   │
│ │ Infra-    │ │               │                │                   │
│ │ structure │ │               │                │                   │
│ └───────────┘ │               │                │                   │
│               │               │                │                   │
└───────────────┴───────────────┴────────────────┴───────────────────┘
```

## Key Concepts

- **Personalized Links**: Unique URLs for each recruiter with personalized content
- **Invisible Authentication**: Authentication without login screens using Lambda@Edge
- **AI Advocate**: AI-powered responses to recruiter questions using AWS Bedrock
- **Serverless Architecture**: Fully serverless implementation on AWS

## Documentation Sections

### Architecture

- [Architecture Overview](architecture/overview.md) - High-level system design
- [Frontend Architecture](architecture/frontend.md) - Next.js frontend implementation
- [Authentication Architecture](architecture/authentication.md) - Link-based authentication system
- [AI Integration Architecture](architecture/ai-integration.md) - AWS Bedrock integration
- [Infrastructure Architecture](architecture/infrastructure/overview.md) - AWS CDK implementation

### Guides

- [Deployment Guide](guides/deployment.md) - Step-by-step deployment instructions
- [Local Development](guides/local-development.md) - Setting up your development environment
- [Troubleshooting](guides/troubleshooting.md) - Solutions for common issues
- [Security Guide](guides/security.md) - Security considerations and implementation

### Reference

- [Environment Variables](reference/environment-variables.md) - Complete environment variable listing
- [Commands](reference/commands.md) - CLI commands for infrastructure management
- [Configuration](reference/configuration.md) - Configuration system explanation

### Contributing

- [Development Workflow](contributing/development-workflow.md) - Contribution process
- [Testing](contributing/testing.md) - Testing guidelines
- [Code Style](contributing/code-style.md) - Coding standards
