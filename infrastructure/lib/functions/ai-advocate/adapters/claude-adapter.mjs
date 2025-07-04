import { ModelAdapter } from './model-adapter.mjs';

/**
 * Adapter for Anthropic Claude models on Amazon Bedrock
 * Supports Claude 3 Haiku, Claude 3 Sonnet, and Claude 3.5 Sonnet (including v1:0 and v2:0)
 */
export class ClaudeAdapter extends ModelAdapter {
  /**
   * Format the prompt for Claude models
   * @param {string} prompt - The prompt text
   * @param {object} options - Generation options
   * @param {Array} conversationHistory - Optional conversation history
   * @returns {object} - Formatted payload for Claude
   */
  formatPrompt(prompt, options = {}, conversationHistory = null) {
    // Extract developer profile information
    const developerProfile = this.extractDeveloperProfile(prompt);
    
    // If conversation history is provided, format as a proper conversation
    if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Extract system instructions and current question
      const systemInstructions = this.extractSystemInstructions(prompt);
      const currentQuestion = this.extractCurrentQuestion(prompt);
      
      // Build messages array from conversation history
      const messages = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Add current question with developer profile information
      if (developerProfile) {
        messages.push({
          role: "user",
          content: `${currentQuestion}\n\nHere is my profile information for reference:\n${developerProfile}`
        });
      } else {
        messages.push({
          role: "user",
          content: currentQuestion
        });
      }
      
      // Prepare system instructions with developer profile
      let systemContent = systemInstructions;
      if (developerProfile) {
        systemContent = `${systemInstructions}\n\nIMPORTANT: Always refer to the following developer profile information when answering questions:\n${developerProfile}`;
      }
      
      return {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: options.maxTokens || 300,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        system: systemContent,
        messages: messages
      };
    }
    
    // Fallback to simple format if no conversation history
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
   * Extract system instructions from the prompt
   * @param {string} prompt - The full prompt
   * @returns {string} - The system instructions part
   */
  extractSystemInstructions(prompt) {
    // Extract everything before "Question: "
    const questionIndex = prompt.indexOf('Question: "');
    if (questionIndex !== -1) {
      return prompt.substring(0, questionIndex).trim();
    }
    return "You are an AI assistant helping with professional inquiries.";
  }

  /**
   * Extract the current question from the prompt
   * @param {string} prompt - The full prompt
   * @returns {string} - The current question
   */
  extractCurrentQuestion(prompt) {
    // Extract the question part
    const questionMatch = prompt.match(/Question: "([^"]+)"/);
    if (questionMatch && questionMatch[1]) {
      return questionMatch[1];
    }
    return prompt; // Fallback to the entire prompt
  }
  
  /**
   * Extract developer profile information from the prompt
   * @param {string} prompt - The full prompt
   * @returns {string} - The developer profile information
   */
  extractDeveloperProfile(prompt) {
    // Extract the skills section between "Use the following information" and "IMPORTANT INSTRUCTIONS"
    const startMarker = "Use the following information about";
    const endMarker = "IMPORTANT INSTRUCTIONS";
    
    const startIndex = prompt.indexOf(startMarker);
    const endIndex = prompt.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
      return prompt.substring(startIndex, endIndex).trim();
    }
    
    // If we can't extract the profile, return null
    return null;
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