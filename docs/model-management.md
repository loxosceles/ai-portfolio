# Model Management Guide

This document provides instructions for managing AI models in the portfolio application.

## Overview

The application supports multiple AI models through an adapter pattern. Models are defined in two separate files:

1. **model-registry.mjs**: The full ES module implementation with adapters used by Lambda functions
2. **supported-models.ts**: A simple list of supported models used by infrastructure code for validation

Both files must be kept in sync when adding or removing models.

## File Locations

- **model-registry.mjs**: `/infrastructure/lib/functions/ai-advocate/adapters/model-registry.mjs`
- **supported-models.ts**: `/infrastructure/lib/resolvers/supported-models.ts`

## Adding a New Model

To add support for a new AI model:

### Step 1: Create a Model Adapter

Create a new adapter class that extends `ModelAdapter`:

```javascript
// /infrastructure/lib/functions/ai-advocate/adapters/new-model-adapter.mjs
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

### Step 2: Update the Model Registry

Add the new adapter to the `ModelRegistry` in `model-registry.mjs`:

```javascript
// /infrastructure/lib/functions/ai-advocate/adapters/model-registry.mjs
import { NewModelAdapter } from './new-model-adapter.mjs';

export class ModelRegistry {
  static adapters = {
    'amazon.titan-text-express-v1': new TitanExpressAdapter(),
    'amazon.titan-text-lite-v1': new TitanLiteAdapter(),
    ollama: new OllamaAdapter(),
    'new-model-id': new NewModelAdapter() // Add the new model here
  };

  // Rest of the class remains unchanged
}
```

### Step 3: Update the Supported Models List

Add the new model to the `SUPPORTED_MODELS` array in `supported-models.ts`:

```typescript
// /infrastructure/lib/resolvers/supported-models.ts
export const SUPPORTED_MODELS = [
  'amazon.titan-text-express-v1',
  'amazon.titan-text-lite-v1',
  'ollama',
  'new-model-id' // Add the new model here
];
```

## Removing a Model

To remove support for an AI model:

1. Remove the model from the `adapters` object in `model-registry.mjs`
2. Remove the model from the `SUPPORTED_MODELS` array in `supported-models.ts`

## Testing a New Model

After adding a new model:

1. Deploy the infrastructure to dev: `pnpm deploy:full:dev`
2. Set the model ID in the environment variable: `BEDROCK_MODEL_ID=new-model-id`
3. Test the AI advocate feature with the new model

## Troubleshooting

### Deployment Errors

If you encounter errors during deployment related to model validation:

1. Check that the model ID is correctly added to both files
2. Ensure the model ID strings match exactly (case-sensitive)
3. Verify that the adapter class is correctly implemented and exported

### Runtime Errors

If the model works during deployment but fails at runtime:

1. Check the Lambda logs for errors
2. Verify that the adapter correctly formats prompts for the specific model
3. Ensure the response parsing logic handles the model's response format correctly
