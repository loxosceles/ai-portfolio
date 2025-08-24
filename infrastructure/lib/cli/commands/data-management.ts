import { IDataManagementOptions, IDataManagementResult } from '../../../types/cli/data-management';
import { EnvironmentManager } from '../../core/env-manager';
import { AWSManager } from '../../core/aws-manager';
import { BaseManager } from '../../core/base-manager';
import { awsManagerConfig, DATA_CONFIG } from '../../../configs/aws-config';
import { envManagerConfig } from '../../../configs/env-config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IDataItem, IDataCollection } from '../../../types/data';
import { IProject } from '../../../types/data/project';
import { IDeveloper } from '../../../types/data';
import { buildSSMPath } from '../../../utils/ssm';
import { validateData } from '../validation';

// Create manager instances
const envManager = new EnvironmentManager(envManagerConfig);
const awsManager = new AWSManager(awsManagerConfig);

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
  stage: string
): Promise<void> {
  const validationErrors: string[] = [];

  // Validate each data type
  for (const [dataType, items] of Object.entries(data)) {
    if (!items || (Array.isArray(items) && items.length === 0)) {
      continue; // Skip empty data
    }

    // For developers, validate the first item as single object (array contains one developer)
    const dataToValidate = dataType === 'developers' && Array.isArray(items) ? items[0] : items;

    const result = await validateData(dataType, dataToValidate, stage);
    if (!result.valid) {
      const errorMessages = result.errors.map((err) => `${dataType}.${err.field}: ${err.message}`);
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
      for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
        const filePath = path.join(dataDir, fileName);
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
      await validateDataWithSchemas(data, stage);
      BaseManager.logVerbose(verbose, `✅ Data validation passed`);
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
      const fileName = DATA_CONFIG.dataFiles[key as keyof typeof DATA_CONFIG.dataFiles];
      if (!fileName) {
        return {
          success: false,
          message: `Unknown data collection: ${key}`,
          error: new Error(`Unknown data collection: ${key}`)
        };
      }
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileName);
      await awsManager.uploadJsonToS3(bucketName, s3Key, items, validatedRegion);
    }
    BaseManager.logVerbose(verbose, `✅ Uploaded data to s3://${bucketName}/data/`);

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
    BaseManager.logVerbose(verbose, `✅ Uploaded schemas to s3://${bucketName}/schemas/`);

    return {
      success: true,
      message: '✅ Data and schema upload completed successfully'
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
  const { verbose, output, region } = options;
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
    for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileName);
      data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
        bucketName,
        s3Key,
        validatedRegion
      );
    }

    // Download schemas from S3
    const schemas: Record<string, unknown> = {};
    for (const [key, fileName] of Object.entries(DATA_CONFIG.schemaFiles)) {
      const s3Key = DATA_CONFIG.schemaPathTemplate.replace('{schemaFile}', fileName);
      schemas[key] = await awsManager.downloadJsonFromS3<unknown>(
        bucketName,
        s3Key,
        validatedRegion
      );
    }

    // Validate downloaded data using schemas
    try {
      await validateDataWithSchemas(data, stage);
      BaseManager.logVerbose(verbose, `✅ Downloaded data validation passed`);
    } catch (error) {
      return {
        success: false,
        message: `Downloaded data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Save to local files if output directory is specified
    if (output) {
      await fs.mkdir(path.join(output, 'data'), { recursive: true });
      await fs.mkdir(path.join(output, 'schemas'), { recursive: true });

      // Save data files
      for (const [key, items] of Object.entries(data)) {
        const fileName = DATA_CONFIG.dataFiles[key as keyof typeof DATA_CONFIG.dataFiles];
        if (!fileName) {
          return {
            success: false,
            message: `Unknown data collection: ${key}`,
            error: new Error(`Unknown data collection: ${key}`)
          };
        }
        await fs.writeFile(path.join(output, 'data', fileName), JSON.stringify(items, null, 2));
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

      BaseManager.logVerbose(verbose, `✅ Data and schemas saved to ${output}`);
    } else {
      // Output data to console if no output directory specified (for file redirection)
      process.stdout.write(`Developers: ${JSON.stringify(data.developers, null, 2)}\n`);
      process.stdout.write(`Projects: ${JSON.stringify(data.projects, null, 2)}\n`);
    }

    return {
      success: true,
      message: '✅ Data and schema download completed successfully',
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

    BaseManager.logVerbose(verbose, `Downloading data from S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data: IDataCollection<IDataItem> = {};
    for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate.replace('{fileName}', fileName);
      data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
        bucketName,
        s3Key,
        validatedRegion
      );
    }

    // Validate data before populating DynamoDB
    try {
      await validateDataWithSchemas(data, stage);
      BaseManager.logVerbose(verbose, `✅ Data validation passed before DynamoDB population`);
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
        `✅ Populated ${recruiterTableName} with ${data.recruiters.length} items`
      );
    }

    BaseManager.logVerbose(
      verbose,
      `✅ Populated ${developerTableName} with ${data.developers.length} items`
    );
    BaseManager.logVerbose(
      verbose,
      `✅ Populated ${projectsTableName} with ${data.projects.length} items`
    );

    return {
      success: true,
      message: '✅ DynamoDB tables populated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to populate DynamoDB: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
