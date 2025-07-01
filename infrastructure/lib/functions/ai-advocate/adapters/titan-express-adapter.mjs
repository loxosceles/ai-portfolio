import { ModelAdapter } from './model-adapter.mjs';

/**
 * Adapter for Amazon Titan Text Express model
 */
export class TitanExpressAdapter extends ModelAdapter {
  formatPrompt(prompt, config) {
    return {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: config.maxTokens || 300,
        temperature: config.temperature || 0.7,
        topP: config.topP || 0.9
      }
    };
  }

  parseResponse(responseBody) {
    if (!responseBody.results?.[0]?.outputText) {
      throw new Error('Invalid response format from Titan Express model');
    }
    return responseBody.results[0].outputText;
  }
}