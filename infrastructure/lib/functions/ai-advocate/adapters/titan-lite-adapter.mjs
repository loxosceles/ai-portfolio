import { ModelAdapter } from './model-adapter.mjs';

/**
 * Adapter for Amazon Titan Text Lite model
 */
export class TitanLiteAdapter extends ModelAdapter {
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
    // The response format is the same as Titan Express for now,
    // but we keep a separate adapter in case it changes in the future
    if (!responseBody.results?.[0]?.outputText) {
      throw new Error('Invalid response format from Titan Lite model');
    }
    return responseBody.results[0].outputText;
  }
}
