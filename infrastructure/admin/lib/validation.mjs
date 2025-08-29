import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import config from './config.mjs';

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Cache for compiled validators
const validatorCache = new Map();

/**
 * Get validation schema from local file system
 * @param {string} dataType - Type of data (developers, projects, recruiters)
 * @param {string} stage - Environment stage (dev/prod)
 * @returns {Promise<object>} JSON schema object
 */
async function getSchemaFromLocal(dataType, stage) {
  const dataTypeConfig = config.tables[dataType];
  if (!dataTypeConfig?.schemaFile) {
    throw new Error(`No schema file configured for data type: ${dataType}`);
  }

  const schemaPath = config.paths.schemaTemplate
    .replace('{stage}', stage)
    .replace('{schemaFile}', dataTypeConfig.schemaFile);
  const schemaFilePath = resolve(config.projectRoot, schemaPath);
  
  try {
    const schemaContent = await readFile(schemaFilePath, 'utf-8');
    return JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema for ${dataType}: ${error.message}`);
  }
}

async function getCachedValidator(dataType, stage, isSingleObject = false) {
  const cacheKey = `${dataType}-${stage}-${isSingleObject ? 'single' : 'bulk'}`;
  
  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey);
  }
  
  const schema = await getSchemaFromLocal(dataType, stage);
  const validationSchema = (isSingleObject && schema.type === 'array' && schema.items) 
    ? schema.items 
    : schema;
    
  const validator = ajv.compile(validationSchema);
  validatorCache.set(cacheKey, validator);
  return validator;
}

export async function validateData(dataType, data, stage) {
  try {
    const isSingleObject = !Array.isArray(data);
    const validator = await getCachedValidator(dataType, stage, isSingleObject);
    const valid = validator(data);
    
    return {
      valid,
      errors: valid ? [] : (validator.errors || []).map(error => ({
        field: error.instancePath || error.schemaPath || 'unknown',
        message: error.message || 'Validation failed',
        value: error.data
      }))
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        field: 'schema',
        message: `Validation failed: ${error.message}`,
        value: null
      }]
    };
  }
}

/**
 * Clear validator cache (useful for testing or schema updates)
 */
export function clearValidatorCache() {
  validatorCache.clear();
}