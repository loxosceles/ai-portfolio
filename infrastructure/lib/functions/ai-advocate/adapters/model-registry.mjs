import { TitanExpressAdapter } from './titan-express-adapter.mjs';
import { TitanLiteAdapter } from './titan-lite-adapter.mjs';
import { OllamaAdapter } from './ollama-adapter.mjs';

/**
 * Registry of supported models and their adapters
 */
export class ModelRegistry {
  static adapters = {
    'amazon.titan-text-express-v1': new TitanExpressAdapter(),
    'amazon.titan-text-lite-v1': new TitanLiteAdapter(),
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
