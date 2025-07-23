# AI Integration Architecture

The AI Portfolio uses AWS Bedrock to provide AI-powered interactions. This document explains the architecture of the AI integration, focusing on the model adapter pattern used to support multiple AI models.

## Overview

The AI integration consists of the following components:

- **AI Advocate**: A service that provides personalized responses to recruiter questions
- **Model Adapters**: A pattern for supporting multiple AI models
- **Prompt Generation**: Dynamic prompt generation based on context
- **Response Handling**: Processing and formatting AI responses

## AI Advocate Service

The AI Advocate service provides two main features:

1. **Personalized Greetings**: AI-generated greetings tailored to the recruiter's company and role
2. **Question Answering**: AI-powered responses to recruiter questions about skills, experience, and projects

The service is implemented as a Lambda function that integrates with AWS Bedrock to generate responses.

## Model Adapter Pattern

The AI Advocate service uses an adapter pattern to support multiple AI models. Each model has its own adapter that handles:

1. **Input formatting**: Converting the standard prompt into the format expected by the specific model
2. **Response parsing**: Extracting the generated text from the model-specific response format

This approach allows the application to use different AI models without changing the core logic.

### Architecture

The adapter pattern consists of the following components:

- **ModelAdapter**: An abstract class that defines the interface for all adapters
- **Concrete Adapters**: Implementations for specific models (e.g., ClaudeAdapter)
- **ModelRegistry**: A registry of all supported models and their adapters
- **Supported Models List**: A separate TypeScript implementation for infrastructure validation

### Supported Models

Currently, the following models are supported:

| Model ID                                    | Description                       | Provider    |
| ------------------------------------------- | --------------------------------- | ----------- |
| `anthropic.claude-3-haiku-20240307-v1:0`    | Anthropic Claude 3 Haiku model    | Anthropic   |
| `anthropic.claude-3-sonnet-20240229-v1:0`   | Anthropic Claude 3 Sonnet model   | Anthropic   |
| `anthropic.claude-3-5-sonnet-20240620-v1:0` | Anthropic Claude 3.5 Sonnet model | Anthropic   |
| `ollama`                                    | Ollama models (local deployment)  | Open Source |

### Implementation

The adapters are implemented using ES modules in the following files:

- `model-adapter.mjs`: The base adapter interface
- `claude-adapter.mjs`: Adapter for Anthropic Claude models
- `ollama-adapter.mjs`: Adapter for Ollama models
- `model-registry.mjs`: Registry of all supported models

Additionally, for infrastructure code (CDK), we use:

- `supported-models.ts`: TypeScript list of supported models for infrastructure validation

### Adding a New Model

To add support for a new model:

1. Create a new adapter class that extends `ModelAdapter`:

```javascript
import { ModelAdapter } from './model-adapter.mjs';

export class NewModelAdapter extends ModelAdapter {
  formatPrompt(prompt, config) {
    // Convert the prompt to the format expected by the new model
    return {
      // Model-specific format
    };
  }

  parseResponse(responseBody) {
    // Extract the generated text from the model-specific response
    if (!responseBody.someProperty) {
      throw new Error('Invalid response format from New Model');
    }
    return responseBody.someProperty;
  }
}
```

2. Add the new adapter to the `ModelRegistry`:

```javascript
import { NewModelAdapter } from './new-model-adapter.mjs';

export class ModelRegistry {
  static adapters = {
    'anthropic.claude-3-haiku-20240307-v1:0': new ClaudeAdapter(),
    'anthropic.claude-3-sonnet-20240229-v1:0': new ClaudeAdapter(),
    'anthropic.claude-3-5-sonnet-20240620-v1:0': new ClaudeAdapter(),
    ollama: new OllamaAdapter(),
    'new-model-id': new NewModelAdapter()
  };

  // ... rest of the class
}
```

### Usage

```javascript
import { ModelRegistry } from './adapters/model-registry.mjs';

// Get the adapter for a specific model
const adapter = ModelRegistry.getAdapter('anthropic.claude-3-sonnet-20240229-v1:0');

// Format the prompt
const payload = adapter.formatPrompt(
  {
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: 'Hello, world!'
  },
  {
    maxTokens: 300,
    temperature: 0.7,
    topP: 0.9
  }
);

// Parse the response
const text = adapter.parseResponse(responseBody);
```

### Error Handling

If an unsupported model is requested, the `ModelRegistry` will throw an error with a list of supported models:

```javascript
throw new Error(
  `Unsupported model: ${modelId}. Please use one of: ${Object.keys(this.adapters).join(', ')}`
);
```

### Configuration

The model ID is specified in the environment variable `BEDROCK_MODEL_ID`. This is validated during deployment to ensure only supported models are used.

### Infrastructure Integration

When adding new models, you must update two files:

1. **model-registry.mjs**: The runtime implementation used by Lambda functions
2. **supported-models.ts**: A TypeScript list of supported models used for infrastructure validation

## Prompt Generation

The AI Advocate service generates prompts based on the context of the interaction:

1. **Greeting Prompts**: Generated based on the recruiter's company, role, and other metadata
2. **Question Answering Prompts**: Generated based on the recruiter's question and conversation history

The prompts are designed to elicit responses that are:

- **Personalized**: Tailored to the recruiter's context
- **Professional**: Maintaining a professional tone
- **Informative**: Providing relevant information about the portfolio owner's skills and experience

## Response Handling

The AI Advocate service processes and formats the responses from the AI models:

1. **Response Parsing**: Extracting the generated text from the model-specific response format
2. **Response Formatting**: Formatting the response for display in the frontend
3. **Error Handling**: Handling errors from the AI models and providing fallback responses

## Frontend Integration

The frontend integrates with the AI Advocate service through the GraphQL API:

1. **Advocate Greeting**: Fetches the personalized greeting for the recruiter
2. **AI Advocate**: Sends questions to the AI Advocate service and displays the responses

For more details on the frontend integration, see the [Frontend Architecture](frontend.md) document.

## Local Development

For local development, the AI Advocate service provides a mock implementation:

1. **Local Request Interceptor**: Intercepts requests to the AI Advocate service
2. **Mock Responses**: Provides mock responses for advocate greetings and AI advocate questions

For more details on local development, see the [Local Development Guide](../guides/local-development.md) document.

## Related Documentation

- [Authentication Architecture](authentication.md) - How the authentication system integrates with the AI Advocate service
- [Infrastructure Architecture](infrastructure/overview.md) - How the infrastructure supports the AI integration
- [Environment Variables Reference](../reference/environment-variables.md) - Environment variables used by the AI integration
