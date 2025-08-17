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

  if (!Array.isArray(project.techStack)) {
    throw new Error('Project techStack must be an array');
  }

  // Validate architecture structure
  if (project.architecture && Array.isArray(project.architecture)) {
    for (const archItem of project.architecture) {
      if (typeof archItem !== 'object' || archItem === null) {
        throw new Error('Architecture items must be objects');
      }

      if (!archItem.name || typeof archItem.name !== 'string' || archItem.name.trim() === '') {
        throw new Error('Architecture item name is required and must be a non-empty string');
      }

      if (
        !archItem.details ||
        typeof archItem.details !== 'string' ||
        archItem.details.trim() === ''
      ) {
        throw new Error('Architecture item details is required and must be a non-empty string');
      }
    }
  }

  // Validate technicalShowcases structure
  if (project.technicalShowcases && Array.isArray(project.technicalShowcases)) {
    for (const showcase of project.technicalShowcases) {
      if (typeof showcase !== 'object' || showcase === null) {
        throw new Error('Technical showcase items must be objects');
      }

      if (!showcase.title || typeof showcase.title !== 'string' || showcase.title.trim() === '') {
        throw new Error('Technical showcase title is required and must be a non-empty string');
      }

      if (
        !showcase.description ||
        typeof showcase.description !== 'string' ||
        showcase.description.trim() === ''
      ) {
        throw new Error(
          'Technical showcase description is required and must be a non-empty string'
        );
      }

      if (!Array.isArray(showcase.highlights)) {
        throw new Error('Technical showcase highlights must be an array');
      }
    }
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

    BaseManager.logVerbose(verbose, `Loading local data for ${stage} stage...`);

    // Load local data
    const localPath = DATA_CONFIG.localPathTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(awsManagerConfig.projectRoot, localPath);
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
      const s3Key = DATA_CONFIG.s3PathTemplate
        .replace('{stage}', stage)
        .replace('{fileName}', fileName);
      await awsManager.uploadJsonToS3(bucketName, s3Key, items, validatedRegion);
    }
    BaseManager.logVerbose(verbose, `✅ Uploaded data to s3://${bucketName}/${stage}/`);

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

    BaseManager.logVerbose(verbose, `Downloading data from S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data: IDataCollection<IDataItem> = {};
    for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate
        .replace('{stage}', stage)
        .replace('{fileName}', fileName);
      data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
        bucketName,
        s3Key,
        validatedRegion
      );
    }

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
      await fs.mkdir(output, { recursive: true });
      for (const [key, items] of Object.entries(data)) {
        const fileName = DATA_CONFIG.dataFiles[key as keyof typeof DATA_CONFIG.dataFiles];
        if (!fileName) {
          return {
            success: false,
            message: `Unknown data collection: ${key}`,
            error: new Error(`Unknown data collection: ${key}`)
          };
        }
        await fs.writeFile(path.join(output, fileName), JSON.stringify(items, null, 2));
      }
      BaseManager.logVerbose(verbose, `✅ Data saved to ${output}`);
    } else {
      // Output data to console if no output directory specified (for file redirection)
      process.stdout.write(`Developers: ${JSON.stringify(data.developers, null, 2)}\n`);
      process.stdout.write(`Projects: ${JSON.stringify(data.projects, null, 2)}\n`);
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

    BaseManager.logVerbose(verbose, `Downloading data from S3 bucket ${bucketName}...`);

    const targetRegion = region || awsManager.getRegionForService('data');
    const validatedRegion = awsManager.validateRegion(targetRegion);

    // Download data from S3
    const data: IDataCollection<IDataItem> = {};
    for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate
        .replace('{stage}', stage)
        .replace('{fileName}', fileName);
      data[key] = await awsManager.downloadJsonFromS3<IDataItem[]>(
        bucketName,
        s3Key,
        validatedRegion
      );
    }

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

    // Get table names from SSM parameters instead of environment
    const developerTableName = await awsManager.getParameter(
      buildSSMPath(stage, 'DEVELOPER_TABLE_NAME'),
      validatedRegion
    );
    const projectsTableName = await awsManager.getParameter(
      buildSSMPath(stage, 'PROJECTS_TABLE_NAME'),
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
