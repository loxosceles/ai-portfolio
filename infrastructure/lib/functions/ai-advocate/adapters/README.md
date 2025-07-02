# Model Adapters for AI Advocate

This directory contains adapters for different AI models used by the AI Advocate service.

For detailed documentation, see [Model Adapters Documentation](../../../../docs/model-adapters.md).

## Adapter Pattern

The adapter pattern is used to provide a consistent interface for different AI models. Each model has its own adapter that handles:

1. **Input formatting**: Converting the standard prompt into the format expected by the specific model
2. **Response parsing**: Extracting the generated text from the model-specific response format

## Supported Models

Currently, the following models are supported:

- `amazon.titan-text-express-v1`: Amazon Bedrock Titan Text Express model
- `amazon.titan-text-lite-v1`: Amazon Bedrock Titan Text Lite model
- `anthropic.claude-3-haiku-20240307-v1:0`: Claude 3 Haiku (fast, cost-effective)
- `anthropic.claude-3-sonnet-20240229-v1:0`: Claude 3 Sonnet (balanced)
- `anthropic.claude-3-5-sonnet-20241022-v2:0`: Claude 3.5 Sonnet (most capable)
- `ollama`: Ollama models (local deployment)

## Adding a New Model

To add support for a new model:

1. Create a new adapter class that implements the `ModelAdapter` interface
2. Add the new adapter to the `ModelRegistry`
3. Update the documentation

## Usage

```javascript
import { ModelRegistry } from './adapters/model-registry.mjs';

// Get the adapter for a specific model
const adapter = ModelRegistry.getAdapter('anthropic.claude-3-haiku-20240307-v1:0');

// Format the prompt
const payload = adapter.formatPrompt('Hello, world!', {
  maxTokens: 300,
  temperature: 0.7,
  topP: 0.9
});

// Parse the response
const text = adapter.parseResponse(responseBody);
```
