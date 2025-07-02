/**
 * Supported Models List for Infrastructure Validation
 *
 * This file maintains the list of supported AI models for validation during
 * infrastructure deployment. It's kept separate from the runtime model registry
 * to avoid module system conflicts between TypeScript/CommonJS (infrastructure)
 * and ES modules (Lambda functions).
 *
 * IMPORTANT: When adding or removing models, update both this file and
 * the model-registry.mjs file in the Lambda function code.
 *
 * @see /docs/model-management.md for detailed instructions on managing models
 */

// Define the supported models - must match those in model-registry.mjs
export const SUPPORTED_MODELS = [
  'amazon.titan-text-express-v1',
  'amazon.titan-text-lite-v1',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'ollama'
];

/**
 * Check if a model is supported
 * @param modelId The model identifier
 * @returns True if the model is supported, false otherwise
 */
export function isModelSupported(modelId: string): boolean {
  return SUPPORTED_MODELS.includes(modelId);
}

/**
 * Get the list of supported models
 * @returns Array of supported model IDs
 */
export function getSupportedModels(): string[] {
  return SUPPORTED_MODELS;
}
