import { IDataManagementOptions, IDataManagementResult } from '../../../types/cli/data-management';
import { EnvironmentManager } from '../../core/env-manager';
import { AWSManager } from '../../core/aws-manager';
import { BaseManager } from '../../core/base-manager';
import { awsManagerConfig, DATA_CONFIG } from '../../../configs/aws-config';
import { envManagerConfig } from '../../../configs/env-config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IDataItem, IDataCollection } from '../../../types/data';
import { buildSSMPath } from '../../../utils/ssm';
// AJV is a fast and widely-used JSON schema validator for JavaScript/TypeScript.
// It was chosen for its performance, compliance with the JSON Schema standard, and strong TypeScript support.
import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
// ajv-formats extends AJV to support additional JSON schema formats (e.g., "date-time", "email", etc.).
import addFormats from 'ajv-formats';

// Initialize AJV with all errors enabled and add support for additional formats.
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Cache for compiled validators to avoid recompiling schemas on every validation.
// The cache key is a combination of table name, environment stage, and schema path.
// This improves performance, especially when validating many items against the same schema.
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Get validation schema from local file system
 * @param tableName - Name of table (developers, projects, recruiters)
 * @param schemaPath - Path to schema files directory
 * @returns JSON schema object
 */
async function getSchemaFromLocal(tableName: string, schemaPath: string): Promise<unknown> {
  const schemaFile = DATA_CONFIG.schemaFiles[tableName as keyof typeof DATA_CONFIG.schemaFiles];
  if (!schemaFile) {
    throw new Error(`No schema file configured for table: ${tableName}`);
  }

  const schemaFilePath = path.join(schemaPath, schemaFile);

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
async function getValidator(
  tableName: string,
  stage: string,
  schemaPath: string
): Promise<ValidateFunction> {
  const cacheKey = `${tableName}-${stage}-${schemaPath}`;

  if (validatorCache.has(cacheKey)) {
    return validatorCache.get(cacheKey)!;
  }

  const schema = await getSchemaFromLocal(tableName, schemaPath);
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
  stage: string,
  schemaPath: string
): Promise<{ valid: boolean; errors: Array<{ field: string; message: string; value: unknown }> }> {
  try {
    const validator = await getValidator(tableName, stage, schemaPath);
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

// Create manager instances
const envManager = new EnvironmentManager(envManagerConfig);
const awsManager = new AWSManager(awsManagerConfig);

/**
 * Get local schema path
 * @param stage - Environment stage
 * @param projectRoot - Project root directory
 * @returns Local schema directory path
 */
function getLocalSchemaPath(stage: string, projectRoot: string): string {
  const localSchemaPath = DATA_CONFIG.localSchemaPathTemplate.replace('{stage}', stage);
  return path.resolve(projectRoot, localSchemaPath);
}

/**
 * Get temporary schema path for downloaded schemas
 * @returns Temporary schema directory path
 */
function getTempSchemaPath(): string {
  return '/tmp/schemas';
}

/**
 * Download schemas to specified path
 * @param targetPath - Directory to download schemas to
 * @param bucketName - S3 bucket name
 * @param region - AWS region
 * @param awsManager - AWS manager instance
 * @returns Downloaded schemas object
 */
async function downloadSchemasToPath(
  targetPath: string,
  bucketName: string,
  region: string,
  awsManager: AWSManager
): Promise<Record<string, unknown>> {
  await fs.mkdir(targetPath, { recursive: true });

  const schemas: Record<string, unknown> = {};

  for (const [key, fileName] of Object.entries(DATA_CONFIG.schemaFiles)) {
    const s3Key = DATA_CONFIG.schemaPathTemplate.replace('{schemaFile}', fileName);
    const schema = await awsManager.downloadJsonFromS3<unknown>(bucketName, s3Key, region);

    // Write to predetermined path
    await fs.writeFile(path.join(targetPath, fileName), JSON.stringify(schema, null, 2));

    schemas[key] = schema;
  }

  return schemas;
}

/**
 * Prepare schema path following the 4-step flow:
 * 1. Determine if download or not
 * 2. Resolve the path (before any action)
 * 3. Act on decision - download if needed into predetermined path
 * 4. Return path where files now exist locally
 */
async function prepareSchemaPath(
  useDownloadedSchemas: boolean,
  stage: string,
  bucketName: string,
  region: string,
  awsManager: AWSManager,
  verbose: boolean
): Promise<{ schemaPath: string; downloadedSchemas?: Record<string, unknown> }> {
  // Step 1: Determine if download or not (inline decision)
  const shouldDownload = useDownloadedSchemas;

  // Step 2: Resolve the path (even though files may not exist yet)
  const schemaPath = shouldDownload
    ? getTempSchemaPath()
    : getLocalSchemaPath(stage, awsManagerConfig.projectRoot);

  // Step 3: Act on our decision - download if needed into the predetermined path
  let downloadedSchemas: Record<string, unknown> | undefined;

  if (shouldDownload) {
    BaseManager.logVerbose(verbose, `Downloading schemas from S3 bucket ${bucketName}...`);
    downloadedSchemas = await downloadSchemasToPath(schemaPath, bucketName, region, awsManager);
    BaseManager.logVerbose(verbose, `Using downloaded schemas from S3`);
  } else {
    BaseManager.logVerbose(verbose, `Using local schemas from ${schemaPath}`);
  }

  // Step 4: Return path to real existing files locally
  return {
    schemaPath, // Path where files now exist locally
    downloadedSchemas
  };
}

/**
 * Validate data using JSON schemas stored locally and in S3.
 *
 * Data validation is handled through JSON schemas that are uploaded/downloaded
 * alongside data files. Local development uses local schema files while CI/CD
 * pipelines use S3 schema files. This approach centralizes validation rules
 * and eliminates hardcoded validation logic.
 *
 * @param data - Data to validate
 * @param stage - Environment stage (dev/prod)
 * @returns Promise<void> - Throws error if validation fails
 */
async function validateDataWithSchemas(
  data: IDataCollection<IDataItem>,
  stage: string,
  schemaPath: string
): Promise<void> {
  const validationErrors: string[] = [];

  // Validate each table
  for (const [tableName, items] of Object.entries(data)) {
    const fileConfig = DATA_CONFIG.dataFiles[tableName];

    if (!items || (Array.isArray(items) && items.length === 0)) {
      if (fileConfig.required) {
        throw new Error(`Required data for table '${tableName}' is missing or empty`);
      }
      continue; // Skip validation for empty optional data
    }

    // For developers, validate the first item as single object (array contains one developer)
    const dataToValidate = tableName === 'developers' && Array.isArray(items) ? items[0] : items;

    const result = await validateData(tableName, dataToValidate, stage, schemaPath);
    if (!result.valid) {
      const errorMessages = result.errors.map((err) => `${tableName}.${err.field}: ${err.message}`);
      validationErrors.push(...errorMessages);
    }
  }

  if (validationErrors.length > 0) {
    throw new Error(`Data validation failed:\n${validationErrors.join('\n')}`);
  }
}

/**
 * Handle upload data command
 */
export async function handleUploadData(
  options: IDataManagementOptions
): Promise<IDataManagementResult> {
  const { verbose, region } = options;
  const stage = awsManager.getStage();

  try {
    // Load environment variables
    const env = envManager.loadEnv(stage);
    const bucketName = env.DATA_BUCKET_NAME;

    if (!bucketName) {
      return {
        success: false,
        message: 'DATA_BUCKET_NAME environment variable is not set',
        error: new Error('DATA_BUCKET_NAME environment variable is not set')
      };
    }

    BaseManager.logVerbose(verbose, `Loading local data for ${stage} stage...`);

    // Load local data
    const localDataPath = DATA_CONFIG.localDataPathTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(awsManagerConfig.projectRoot, localDataPath);
    const data: IDataCollection<IDataItem> = {};

    try {
      for (const [key, fileConfig] of Object.entries(DATA_CONFIG.dataFiles)) {
        const filePath = path.join(dataDir, fileConfig.file);
        const content = await fs.readFile(filePath, 'utf-8');
        data[key] = JSON.parse(content) as IDataItem[];
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to load data files: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Load local schemas
    const localSchemaPath = DATA_CONFIG.localSchemaPathTemplate.replace('{stage}', stage);
    const schemaDir = path.resolve(awsManagerConfig.projectRoot, localSchemaPath);
    const schemas: Record<string, unknown> = {};

    try {
      for (const [key, fileName] of Object.entries(DATA_CONFIG.schemaFiles)) {
        const filePath = path.join(schemaDir, fileName);
        const content = await fs.readFile(filePath, 'utf-8');
        schemas[key] = JSON.parse(content);
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to load schema files: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Validate data using schemas before upload
    try {
      const localSchemaPath = DATA_CONFIG.localSchemaPathTemplate.replace('{stage}', stage);
      const schemaPath = path.resolve(awsManagerConfig.projectRoot, localSchemaPath);
      await validateDataWithSchemas(data, stage, schemaPath);
      BaseManager.logVerbose(verbose, `Data validation passed`);
    } catch (error) {
      return {
        success: false,
        message: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    BaseManager.logVerbose(verbose, `Uploading data to S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Upload data to S3
    for (const [key, items] of Object.entries(data)) {
      const fileConfig = DATA_CONFIG.dataFiles[key];
      if (!fileConfig) {
        return {
          success: false,
          message: `Unknown data collection: ${key}`,
          error: new Error(`Unknown data collection: ${key}`)
        };
      }
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileConfig.file);
      await awsManager.uploadJsonToS3(bucketName, s3Key, items, validatedRegion);
    }
    BaseManager.logVerbose(verbose, `Uploaded data to s3://${bucketName}/data/`);

    // Upload schemas to S3
    for (const [key, schema] of Object.entries(schemas)) {
      const fileName = DATA_CONFIG.schemaFiles[key as keyof typeof DATA_CONFIG.schemaFiles];
      if (!fileName) {
        return {
          success: false,
          message: `Unknown schema collection: ${key}`,
          error: new Error(`Unknown schema collection: ${key}`)
        };
      }
      const s3Key = DATA_CONFIG.schemaPathTemplate.replace('{schemaFile}', fileName);
      await awsManager.uploadJsonToS3(bucketName, s3Key, schema, validatedRegion);
    }
    BaseManager.logVerbose(verbose, `Uploaded schemas to s3://${bucketName}/schemas/`);

    return {
      success: true,
      message: 'Data and schema upload completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to upload data: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Handle download data command
 */
export async function handleDownloadData(
  options: IDataManagementOptions
): Promise<IDataManagementResult> {
  const { verbose, output, region, useDownloadedSchemas } = options;
  const stage = awsManager.getStage();

  try {
    // Load environment variables
    const env = envManager.loadEnv(stage);
    const bucketName = env.DATA_BUCKET_NAME;

    if (!bucketName) {
      return {
        success: false,
        message: 'DATA_BUCKET_NAME environment variable is not set',
        error: new Error('DATA_BUCKET_NAME environment variable is not set')
      };
    }

    BaseManager.logVerbose(verbose, `Downloading data from S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data: IDataCollection<IDataItem> = {};
    for (const [key, fileConfig] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileConfig.file);

      try {
        data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
          bucketName,
          s3Key,
          validatedRegion
        );
      } catch (error: unknown) {
        if (!fileConfig.required && error instanceof Error && error.name === 'NoSuchKey') {
          BaseManager.logVerbose(
            verbose,
            `ℹ️ Optional file ${fileConfig.file} not found, skipping`
          );
          data[key] = [];
          continue;
        }
        throw error;
      }
    }

    // Use structured schema handling
    const { schemaPath, downloadedSchemas } = await prepareSchemaPath(
      useDownloadedSchemas ?? false,
      stage,
      bucketName,
      validatedRegion,
      awsManager,
      verbose
    );

    // Handle schemas for file saving if output is specified and not using downloaded schemas
    const schemas: Record<string, unknown> = downloadedSchemas || {};
    if (output && !useDownloadedSchemas) {
      // Still download schemas for file saving when using local schemas
      for (const [key, fileName] of Object.entries(DATA_CONFIG.schemaFiles)) {
        const s3Key = DATA_CONFIG.schemaPathTemplate.replace('{schemaFile}', fileName);
        schemas[key] = await awsManager.downloadJsonFromS3<unknown>(
          bucketName,
          s3Key,
          validatedRegion
        );
      }
    }

    // Validate downloaded data using schemas
    try {
      await validateDataWithSchemas(data, stage, schemaPath);
      BaseManager.logVerbose(verbose, `Downloaded data validation passed`);
    } catch (error) {
      return {
        success: false,
        message: `Downloaded data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Validate output directory if specified
    if (output) {
      try {
        const outputStat = await fs.stat(output);
        if (!outputStat.isDirectory()) {
          return {
            success: false,
            message: `Output path '${output}' exists but is not a directory`,
            error: new Error(`Output path '${output}' exists but is not a directory`)
          };
        }
      } catch {
        return {
          success: false,
          message: `Output directory '${output}' does not exist`,
          error: new Error(`Output directory '${output}' does not exist`)
        };
      }

      // Save to local files if output directory is specified and valid
      await fs.mkdir(path.join(output, 'data'), { recursive: true });
      await fs.mkdir(path.join(output, 'schemas'), { recursive: true });

      // Save data files
      for (const [key, items] of Object.entries(data)) {
        const fileConfig = DATA_CONFIG.dataFiles[key];
        if (!fileConfig) {
          return {
            success: false,
            message: `Unknown data collection: ${key}`,
            error: new Error(`Unknown data collection: ${key}`)
          };
        }
        await fs.writeFile(
          path.join(output, 'data', fileConfig.file),
          JSON.stringify(items, null, 2)
        );
      }

      // Save schema files
      for (const [key, schema] of Object.entries(schemas)) {
        const fileName = DATA_CONFIG.schemaFiles[key as keyof typeof DATA_CONFIG.schemaFiles];
        if (!fileName) {
          return {
            success: false,
            message: `Unknown schema collection: ${key}`,
            error: new Error(`Unknown schema collection: ${key}`)
          };
        }
        await fs.writeFile(path.join(output, 'schemas', fileName), JSON.stringify(schema, null, 2));
      }

      BaseManager.logVerbose(verbose, `Data and schemas saved to ${output}`);
    } else {
      // Output data to console if no output directory specified (for file redirection)
      process.stdout.write(`Developers: ${JSON.stringify(data.developers, null, 2)}\n`);
      process.stdout.write(`Projects: ${JSON.stringify(data.projects, null, 2)}\n`);
    }

    return {
      success: true,
      message: 'Data and schema download completed successfully',
      data
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to download data: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Handle populate DynamoDB command
 */
export async function handlePopulateDynamoDB(
  options: IDataManagementOptions
): Promise<IDataManagementResult> {
  const { verbose, region, useDownloadedSchemas } = options;
  const stage = awsManager.getStage();

  try {
    // Load environment variables
    const env = envManager.loadEnv(stage);
    const bucketName = env.DATA_BUCKET_NAME;

    if (!bucketName) {
      return {
        success: false,
        message: 'DATA_BUCKET_NAME environment variable is not set',
        error: new Error('DATA_BUCKET_NAME environment variable is not set')
      };
    }

    BaseManager.logVerbose(verbose, `Downloading data from S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data: IDataCollection<IDataItem> = {};
    for (const [key, fileConfig] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileConfig.file);

      try {
        data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
          bucketName,
          s3Key,
          validatedRegion
        );
      } catch (error: unknown) {
        if (!fileConfig.required && error instanceof Error && error.name === 'NoSuchKey') {
          BaseManager.logVerbose(
            verbose,
            `ℹ️ Optional file ${fileConfig.file} not found, skipping`
          );
          data[key] = [];
          continue;
        }
        throw error;
      }
    }

    // Use structured schema handling
    const { schemaPath } = await prepareSchemaPath(
      useDownloadedSchemas ?? false,
      stage,
      bucketName,
      validatedRegion,
      awsManager,
      verbose
    );

    // Validate data before populating DynamoDB
    try {
      await validateDataWithSchemas(data, stage, schemaPath);
      BaseManager.logVerbose(verbose, `Data validation passed before DynamoDB population`);
    } catch (error) {
      return {
        success: false,
        message: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Get table names from SSM parameters instead of environment
    const developerTableName = await awsManager.getParameter(
      buildSSMPath(stage, 'DEVELOPER_TABLE_NAME'),
      validatedRegion
    );
    const projectsTableName = await awsManager.getParameter(
      buildSSMPath(stage, 'PROJECTS_TABLE_NAME'),
      validatedRegion
    );
    const recruiterTableName = await awsManager.getParameter(
      buildSSMPath(stage, 'RECRUITER_PROFILES_TABLE_NAME'),
      validatedRegion
    );

    if (!developerTableName || !projectsTableName) {
      return {
        success: false,
        message: 'Table name parameters not found in SSM',
        error: new Error('DEVELOPER_TABLE_NAME or PROJECTS_TABLE_NAME not found in SSM')
      };
    }

    BaseManager.logVerbose(verbose, `Populating DynamoDB tables for ${stage} stage...`);

    // Populate tables separately
    await awsManager.batchWriteToDynamoDB(developerTableName, data.developers, validatedRegion);
    await awsManager.batchWriteToDynamoDB(projectsTableName, data.projects, validatedRegion);

    // Populate recruiter table if data exists and table is available
    if (data.recruiters && data.recruiters.length > 0 && recruiterTableName) {
      await awsManager.batchWriteToDynamoDB(recruiterTableName, data.recruiters, validatedRegion);
      BaseManager.logVerbose(
        verbose,
        `Populated ${recruiterTableName} with ${data.recruiters.length} items`
      );
    }

    BaseManager.logVerbose(
      verbose,
      `Populated ${developerTableName} with ${data.developers.length} items`
    );
    BaseManager.logVerbose(
      verbose,
      `Populated ${projectsTableName} with ${data.projects.length} items`
    );

    return {
      success: true,
      message: 'DynamoDB tables populated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to populate DynamoDB: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
