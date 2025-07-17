import { ClaudeAdapter } from './claude-adapter.mjs';
import { OllamaAdapter } from './ollama-adapter.mjs';

/**
 * Registry of supported models and their adapters
 */
export class ModelRegistry {
  static adapters = {
    'anthropic.claude-3-haiku-20240307-v1:0': new ClaudeAdapter(),
    'anthropic.claude-3-sonnet-20240229-v1:0': new ClaudeAdapter(),
    'anthropic.claude-3-5-sonnet-20240620-v1:0': new ClaudeAdapter(),
    ollama: new OllamaAdapter()
  };

  /**
   * Get the adapter for a specific model
   * @param {string} modelId The model identifier
   * @returns The adapter for the specified model
   * @throws {Error} if the model is not supported
   */
  static getAdapter(modelId) {
    const adapter = this.adapters[modelId];
    if (!adapter) {
      throw new Error(
        `Unsupported model: ${modelId}. Please use one of: ${Object.keys(this.adapters).join(', ')}`
      );
    }
    return adapter;
  }

  /**
   * Check if a model is supported
   * @param {string} modelId The model identifier
   * @returns {boolean} True if the model is supported, false otherwise
   */
  static isModelSupported(modelId) {
    return !!this.adapters[modelId];
  }

  /**
   * Get the list of supported models
   * @returns {string[]} Array of supported model IDs
   */
  static getSupportedModels() {
    return Object.keys(this.adapters);
  }
}
