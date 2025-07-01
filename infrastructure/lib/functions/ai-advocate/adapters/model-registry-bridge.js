// Bridge file to expose ES module functionality to CommonJS
// This allows TypeScript files using CommonJS to access the ModelRegistry

// Since we can't directly import ES modules in CommonJS synchronously,
// we need to create a bridge that loads the module in a way that works
// with the CDK's synchronous execution model

// We're using a workaround that leverages Node.js's ability to load .mjs files
// This is not ideal but works for our specific use case
const path = require('path');
const fs = require('fs');

// Get the path to the model registry
const modelRegistryPath = path.join(__dirname, 'model-registry.mjs');

// Function to get supported models
function getSupportedModels() {
  try {
    // This is a hack to extract the supported models from the file
    // It's still parsing the file, but in a more targeted way than before
    const content = fs.readFileSync(modelRegistryPath, 'utf8');

    // Look for the adapters object in the ModelRegistry class
    const adaptersMatch = content.match(/static\s+adapters\s*=\s*{([^}]*)}/s);
    if (!adaptersMatch) {
      console.error('Could not find adapters in model registry');
      return [];
    }

    // Extract model IDs from the adapters object
    const adaptersContent = adaptersMatch[1];
    const modelIdRegex = /'([^']+)':/g;
    const models = [];
    let match;

    while ((match = modelIdRegex.exec(adaptersContent)) !== null) {
      models.push(match[1]);
    }

    return models;
  } catch (error) {
    console.error('Failed to get supported models:', error);
    return [];
  }
}

// Function to check if a model is supported
function isModelSupported(modelId) {
  return getSupportedModels().includes(modelId);
}

// Cache the supported models to avoid reading the file multiple times
const supportedModels = getSupportedModels();

// Export the functions
module.exports = {
  getSupportedModels: () => supportedModels,
  isModelSupported: (modelId) => supportedModels.includes(modelId)
};
