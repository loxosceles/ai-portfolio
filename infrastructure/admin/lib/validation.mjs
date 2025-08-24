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
  const dataTypeConfig = config.dataTypes[dataType];
  if (!dataTypeConfig?.schemaFile) {
    throw new Error(`No schema file configured for data type: ${dataType}`);
  }

  const schemaPath = config.paths.schemaTemplate.replace('{schemaFile}', dataTypeConfig.schemaFile);
  const schemaFilePath = resolve(config.projectRoot, schemaPath);
  
  try {
    const schemaContent = await readFile(schemaFilePath, 'utf-8');
    return JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema for ${dataType}: ${error.message}`);
  }
}

/**
 * Get or create validator for data type
 * @param {string} dataType - Type of data (developers, projects, recruiters)
 * @param {string} stage - Environment stage (dev/prod)
 * @returns {Promise<Function>} AJV validator function
 */
async function getValidator(dataType, stage) {
  const cacheKey = `${dataType}-${stage}`;
  
  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey);
  }
  
  const schema = await getSchemaFromLocal(dataType, stage);
  const validator = ajv.compile(schema);
  
  validatorCache.set(cacheKey, validator);
  return validator;
}

/**
 * Validate data against schema
 * @param {string} dataType - Type of data (developers, projects, recruiters)
 * @param {unknown} data - Data to validate
 * @param {string} stage - Environment stage (dev/prod)
 * @returns {Promise<{valid: boolean, errors: Array}>} Validation result with errors if any
 */
export async function validateData(dataType, data, stage) {
  try {
    const validator = await getValidator(dataType, stage);
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