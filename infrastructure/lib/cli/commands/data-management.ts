import { IDataManagementOptions, IDataManagementResult } from '../../../types/cli/data-management';
import { EnvironmentManager } from '../../core/env-manager';
import { AWSManager } from '../../core/aws-manager';
import { awsManagerConfig } from '../../../configs/aws-config';
import { envManagerConfig } from '../../../configs/env-config';
import { IDataItem, IDataCollection } from '../../../types/data';
import { IProject } from '../../../types/data/project';
import { IDeveloper } from '../../../types/data';

// Create manager instances
const envManager = new EnvironmentManager(envManagerConfig);
const awsManager = new AWSManager(awsManagerConfig);

/**
 * Advanced validation functions for data integrity
 */

/**
 * Validate a developer profile
 * @param developer - Developer profile to validate
 * @returns True if valid, throws an error if invalid
 */
function validateDeveloper(developer: Partial<IDeveloper>): boolean {
  if (!developer.id) {
    throw new Error('Developer ID is required');
  }

  if (!developer.name) {
    throw new Error('Developer name is required');
  }

  if (!developer.title) {
    throw new Error('Developer title is required');
  }

  if (!developer.bio) {
    throw new Error('Developer bio is required');
  }

  if (!developer.email) {
    throw new Error('Developer email is required');
  }

  if (!Array.isArray(developer.skillSets)) {
    throw new Error('Developer skillSets must be an array');
  }

  for (const skillSet of developer.skillSets) {
    if (!skillSet.id) {
      throw new Error('SkillSet ID is required');
    }

    if (!skillSet.name) {
      throw new Error('SkillSet name is required');
    }

    if (!Array.isArray(skillSet.skills)) {
      throw new Error('SkillSet skills must be an array');
    }
  }

  return true;
}

/**
 * Validate a project
 * @param project - Project to validate
 * @returns True if valid, throws an error if invalid
 */
function validateProject(project: Partial<IProject>): boolean {
  if (!project.id) {
    throw new Error('Project ID is required');
  }

  if (!project.title) {
    throw new Error('Project title is required');
  }

  if (!project.description) {
    throw new Error('Project description is required');
  }

  if (!project.status) {
    throw new Error('Project status is required');
  }

  if (!['Active', 'Completed', 'Planned'].includes(project.status)) {
    throw new Error('Project status must be Active, Completed, or Planned');
  }

  if (!Array.isArray(project.highlights)) {
    throw new Error('Project highlights must be an array');
  }

  if (!Array.isArray(project.tech)) {
    throw new Error('Project tech must be an array');
  }

  if (!project.developerId) {
    throw new Error('Project developerId is required');
  }

  return true;
}

/**
 * Validate static data
 * @param data - Static data to validate
 * @returns True if valid, throws an error if invalid
 */
function validateStaticData(data: IDataCollection<IDataItem>): boolean {
  if (!data.developers || !Array.isArray(data.developers)) {
    throw new Error('Developers must be an array');
  }

  if (!data.projects || !Array.isArray(data.projects)) {
    throw new Error('Projects must be an array');
  }

  for (const developer of data.developers) {
    validateDeveloper(developer);
  }

  for (const project of data.projects) {
    validateProject(project);
  }

  return true;
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

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Loading local data for ${stage} stage...`);
    }

    const data = await awsManager.loadLocalData(stage);

    // Perform advanced validation before upload
    try {
      validateStaticData(data);
    } catch (error) {
      return {
        success: false,
        message: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Uploading data to S3 bucket ${bucketName}...`);
    }

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);
    await awsManager.uploadDataToS3(stage, bucketName, data, validatedRegion);

    return {
      success: true,
      message: '✅ Data upload completed successfully'
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

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Downloading data from S3 bucket ${bucketName}...`);
    }

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);
    const data = await awsManager.downloadDataFromS3(stage, bucketName, validatedRegion);

    // Perform advanced validation after download
    try {
      validateStaticData(data);
    } catch (error) {
      return {
        success: false,
        message: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    // Save to local files if output directory is specified
    if (output) {
      await awsManager.saveLocalData(data, output);
    }

    return {
      success: true,
      message: '✅ Data download completed successfully',
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

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Downloading data from S3 bucket ${bucketName}...`);
    }

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data = await awsManager.downloadDataFromS3(stage, bucketName, validatedRegion);

    // Validate data
    try {
      validateStaticData(data);
    } catch (error) {
      return {
        success: false,
        message: `Data validation failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`Populating DynamoDB tables for ${stage} stage...`);
    }

    // Populate DynamoDB tables
    await awsManager.populateDynamoDB(stage, data, validatedRegion);

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
