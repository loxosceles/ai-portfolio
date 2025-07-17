import { ModelAdapter } from './model-adapter.mjs';

/**
 * Adapter for Ollama models
 */
export class OllamaAdapter extends ModelAdapter {
  formatPrompt(prompt, config, conversationHistory = null) {
    return {
      prompt: prompt,
      model: config.model || 'llama2',
      options: {
        temperature: config.temperature || 0.7,
        top_p: config.topP || 0.9,
        max_tokens: config.maxTokens || 300
      }
    };
  }

  parseResponse(responseBody) {
    if (typeof responseBody.response !== 'string') {
      throw new Error('Invalid response format from Ollama model');
    }
    return responseBody.response;
  }
}