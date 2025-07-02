import { ModelAdapter } from './model-adapter.mjs';

/**
 * Adapter for Anthropic Claude models on Amazon Bedrock
 * Supports Claude 3 Haiku, Claude 3 Sonnet, and Claude 3.5 Sonnet
 */
export class ClaudeAdapter extends ModelAdapter {
  /**
   * Format the prompt for Claude models
   * @param {string} prompt - The prompt text
   * @param {object} options - Generation options
   * @returns {object} - Formatted payload for Claude
   */
  formatPrompt(prompt, options = {}) {
    return {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: options.maxTokens || 300,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };
  }

  /**
   * Parse the response from Claude models
   * @param {object} response - Raw response from Bedrock
   * @returns {string} - Extracted text
   */
  parseResponse(response) {
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      return response.content[0].text || '';
    }
    
    // Fallback for different response formats
    if (response.completion) {
      return response.completion;
    }
    
    if (typeof response === 'string') {
      return response;
    }
    
    throw new Error('Unable to parse Claude response: ' + JSON.stringify(response));
  }
}