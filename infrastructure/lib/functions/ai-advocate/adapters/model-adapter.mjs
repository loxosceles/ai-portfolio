/**
 * Interface for model adapters
 * Each supported model must implement this interface
 */
export class ModelAdapter {
  /**
   * Format the prompt for the specific model
   * @param {string} prompt The text prompt to send to the model
   * @param {object} config Configuration options like temperature, max tokens, etc.
   * @returns {object} Formatted payload ready to be sent to the model
   */
  formatPrompt(prompt, config) {
    throw new Error('Method not implemented');
  }

  /**
   * Parse the response from the model into a standardized format
   * @param {object} responseBody The raw response body from the model
   * @returns {string} Extracted text response as a string
   * @throws {Error} if the response format is invalid
   */
  parseResponse(responseBody) {
    throw new Error('Method not implemented');
  }
}