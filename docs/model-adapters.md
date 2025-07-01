# Model Adapters for AI Advocate

The AI Advocate service uses an adapter pattern to support multiple AI models. This document explains the design, implementation, and how to add support for new models.

## Adapter Pattern

The adapter pattern is used to provide a consistent interface for different AI models. Each model has its own adapter that handles:

1. **Input formatting**: Converting the standard prompt into the format expected by the specific model
2. **Response parsing**: Extracting the generated text from the model-specific response format

This approach allows the application to use different AI models without changing the core logic.

## Architecture

![Model Adapter Architecture](../assets/model-adapter-architecture.png)

The adapter pattern consists of the following components:

- **ModelAdapter**: An abstract class that defines the interface for all adapters
- **Concrete Adapters**: Implementations for specific models (e.g., TitanExpressAdapter)
- **ModelRegistry**: A registry of all supported models and their adapters
- **Supported Models List**: A separate TypeScript implementation for infrastructure validation

## Supported Models

Currently, the following models are supported:

| Model ID                       | Description                             | Provider    |
| ------------------------------ | --------------------------------------- | ----------- |
| `amazon.titan-text-express-v1` | Amazon Bedrock Titan Text Express model | AWS         |
| `amazon.titan-text-lite-v1`    | Amazon Bedrock Titan Text Lite model    | AWS         |
| `ollama`                       | Ollama models (local deployment)        | Open Source |

## Implementation

The adapters are implemented using ES modules in the following files:

- `model-adapter.mjs`: The base adapter interface
- `titan-express-adapter.mjs`: Adapter for Amazon Titan Text Express model
- `titan-lite-adapter.mjs`: Adapter for Amazon Titan Text Lite model
- `ollama-adapter.mjs`: Adapter for Ollama models
- `model-registry.mjs`: Registry of all supported models

Additionally, for infrastructure code (CDK), we use:

- `supported-models.ts`: TypeScript list of supported models for infrastructure validation

## Adding a New Model

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
    'amazon.titan-text-express-v1': new TitanExpressAdapter(),
    'amazon.titan-text-lite-v1': new TitanLiteAdapter(),
    ollama: new OllamaAdapter(),
    'new-model-id': new NewModelAdapter()
  };

  // ... rest of the class
}
```

## Usage

```javascript
import { ModelRegistry } from './adapters/model-registry.mjs';

// Get the adapter for a specific model
const adapter = ModelRegistry.getAdapter('amazon.titan-text-express-v1');

// Format the prompt
const payload = adapter.formatPrompt('Hello, world!', {
  maxTokens: 300,
  temperature: 0.7,
  topP: 0.9
});

// Parse the response
const text = adapter.parseResponse(responseBody);
```

## Error Handling

If an unsupported model is requested, the `ModelRegistry` will throw an error with a list of supported models:

```javascript
throw new Error(
  `Unsupported model: ${modelId}. Please use one of: ${Object.keys(this.adapters).join(', ')}`
);
```

## Configuration

The model ID is specified in the environment variable `BEDROCK_MODEL_ID`. This is validated during deployment to ensure only supported models are used.

## Module System Separation

The project uses two different module systems:

1. **CommonJS (TypeScript)**: Used for infrastructure code (CDK)
2. **ES Modules (.mjs)**: Used for Lambda functions

To handle this separation cleanly, we maintain two separate implementations of the model registry:

1. **model-registry.mjs**: Full ES module implementation with adapters used by Lambda functions
2. **supported-models.ts**: Simple list of supported models used by infrastructure code for validation

When adding new models, you must update both files to keep them in sync. See [Model Management Guide](./model-management.md) for detailed instructions.

### Why Two Implementations?

This separation follows clean architecture principles by:

1. Respecting layer boundaries between infrastructure and function code
2. Avoiding module system conflicts (CommonJS vs ES Modules)
3. Keeping each implementation focused on its specific needs

The infrastructure code only needs to know which models are valid, while the Lambda functions need the full implementation details of how to work with each model.
