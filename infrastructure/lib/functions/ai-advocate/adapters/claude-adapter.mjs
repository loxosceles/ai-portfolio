import { ModelAdapter } from './model-adapter.mjs';

// Default options for Claude models
const DEFAULT_OPTIONS = {
  maxTokens: 150,
  temperature: 0.3,
  topP: 0.7
};

/**
 * Adapter for Anthropic Claude models on Amazon Bedrock
 * Supports Claude 3 Haiku, Claude 3 Sonnet, and Claude 3.5 Sonnet (including v1:0 and v2:0)
 */
export class ClaudeAdapter extends ModelAdapter {
  /**
   * Format the prompt for Claude models
   * @param {object} promptData - Object with systemPrompt and userPrompt
   * @param {object} options - Generation options
   * @param {Array} conversationHistory - Optional conversation history
   * @returns {object} - Formatted payload for Claude
   */
  formatPrompt(promptData, options = {}, conversationHistory = null) {
    const { systemPrompt, userPrompt } = promptData;
    
    // Build messages array from conversation history (or empty array)
    const messages = [];
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    // Add current user prompt
    messages.push({
      role: "user",
      content: userPrompt
    });
    
    const modelConfig = { ...DEFAULT_OPTIONS, ...options };
    
    return {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.topP,
      system: systemPrompt,
      messages: messages
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