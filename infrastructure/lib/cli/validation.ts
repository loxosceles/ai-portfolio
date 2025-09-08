import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DATA_CONFIG } from '../../configs/aws-config';
import { awsManagerConfig } from '../../configs/aws-config';

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Cache for compiled validators
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Get validation schema from local file system
 * @param tableName - Name of table (developers, projects, recruiters)
 * @param stage - Environment stage (dev/prod)
 * @returns JSON schema object
 */
async function getSchemaFromLocal(tableName: string, stage: string): Promise<unknown> {
  const schemaFile = DATA_CONFIG.schemaFiles[tableName as keyof typeof DATA_CONFIG.schemaFiles];
  if (!schemaFile) {
    throw new Error(`No schema file configured for table: ${tableName}`);
  }

  const schemaPath = DATA_CONFIG.localSchemaPathTemplate.replace('{stage}', stage);
  const schemaFilePath = path.resolve(awsManagerConfig.projectRoot, schemaPath, schemaFile);

  try {
    const schemaContent = await fs.readFile(schemaFilePath, 'utf-8');
    return JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(
      `Failed to load schema for ${tableName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get or create validator for table
 * @param tableName - Name of table (developers, projects, recruiters)
 * @param stage - Environment stage (dev/prod)
 * @returns AJV validator function
 */
async function getValidator(tableName: string, stage: string): Promise<ValidateFunction> {
  const cacheKey = `${tableName}-${stage}`;

  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey)!;
  }

  const schema = await getSchemaFromLocal(tableName, stage);
  const validator = ajv.compile(schema as object);

  validatorCache.set(cacheKey, validator);
  return validator;
}

/**
 * Validate data against schema
 * @param tableName - Name of table (developers, projects, recruiters)
 * @param data - Data to validate
 * @param stage - Environment stage (dev/prod)
 * @returns Validation result with errors if any
 */
export async function validateData(
  tableName: string,
  data: unknown,
  stage: string
): Promise<{ valid: boolean; errors: Array<{ field: string; message: string; value: unknown }> }> {
  try {
    const validator = await getValidator(tableName, stage);
    const valid = validator(data);

    return {
      valid,
      errors: valid
        ? []
        : (validator.errors || []).map((error: ErrorObject) => ({
            field: error.instancePath || error.schemaPath || 'unknown',
            message: error.message || 'Validation failed',
            value: error.data
          }))
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: 'schema',
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          value: null
        }
      ]
    };
  }
}

/**
 * Clear validator cache (useful for testing or schema updates)
 */
export function clearValidatorCache(): void {
  validatorCache.clear();
}
