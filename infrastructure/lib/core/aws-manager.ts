import { SSMClient, PutParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { BaseManager } from './base-manager';
import { IBaseManagerConfig } from '../../types/config';
import { IDataItem, IDataCollection } from '../../types/data';
import { Stage } from '../../types/common';
import { PARAMETER_SCHEMA, DATA_CONFIG } from '../../configs/aws-config';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * AWS Manager
 *
 * Unified manager for all AWS service operations
 */
export class AWSManager extends BaseManager {
  constructor(config: IBaseManagerConfig) {
    super(config);
  }

  // SSM Operations
  async putParameter(name: string, value: string, region: string): Promise<void> {
    const client = new SSMClient({ region });
    const command = new PutParameterCommand({
      Name: name,
      Value: value,
      Type: 'String',
      Overwrite: true
    });
    await client.send(command);
  }

  async getParametersByPath(
    path: string,
    region: string
  ): Promise<Array<{ Name?: string; Value?: string }>> {
    const client = new SSMClient({ region });
    let nextToken: string | undefined;
    let allParameters: Array<{ Name?: string; Value?: string }> = [];

    try {
      do {
        const command = new GetParametersByPathCommand({
          Path: path,
          Recursive: true,
          WithDecryption: true,
          NextToken: nextToken
        });

        const response = await client.send(command);
        if (response.Parameters) {
          allParameters = [...allParameters, ...response.Parameters];
        }
        // Type assertion for NextToken since TypeScript doesn't recognize it on all response types
        nextToken = (response as any).NextToken;
      } while (nextToken);

      return allParameters;
    } catch (error) {
      console.error(`Error getting parameters by path ${path}: ${error}`);
      return [];
    }
  }

  // S3 Operations
  async uploadJsonToS3<T>(bucketName: string, key: string, data: T, region: string): Promise<void> {
    const client = new S3Client({ region });
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
      })
    );
  }

  async downloadJsonFromS3<T>(bucketName: string, key: string, region: string): Promise<T> {
    const client = new S3Client({ region });
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    );

    const json = await response.Body?.transformToString();
    if (!json) {
      throw new Error(`Failed to download ${key} from S3`);
    }
    return JSON.parse(json) as T;
  }

  // DynamoDB Operations
  async populateDynamoDB(
    stage: Stage,
    data: IDataCollection<IDataItem>,
    region: string
  ): Promise<void> {
    const client = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(client);

    if (data.developers && data.developers.length > 0) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [`PortfolioDevelopers-${stage}`]: data.developers.map((dev) => ({
              PutRequest: { Item: dev }
            }))
          }
        })
      );
      // eslint-disable-next-line no-console
      console.log(`✅ Populated PortfolioDevelopers-${stage} with ${data.developers.length} items`);
    }

    if (data.projects && data.projects.length > 0) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [`PortfolioProjects-${stage}`]: data.projects.map((proj) => ({
              PutRequest: { Item: proj }
            }))
          }
        })
      );
      // eslint-disable-next-line no-console
      console.log(`✅ Populated PortfolioProjects-${stage} with ${data.projects.length} items`);
    }
  }

  // SSM Parameter Management Operations
  async uploadParameters(
    stage: Stage,
    params: Record<string, string>,
    region: string,
    verbose: boolean = false
  ): Promise<number> {
    const regionParams = PARAMETER_SCHEMA[stage][region];
    if (!regionParams || regionParams.length === 0) {
      this.logVerbose(verbose, `No parameters configured for ${stage} in ${region}`);
      return 0;
    }

    // eslint-disable-next-line no-console
    console.log(`Uploading stack parameters for ${stage} stage to ${region}...`);
    let uploadCount = 0;
    let errorCount = 0;

    for (const paramName of regionParams) {
      this.logVerbose(verbose, `Processing parameter: ${paramName}`);
      if (!params[paramName]) {
        console.warn(`Warning: Parameter ${paramName} not found in environment files`);
        errorCount++;
        continue;
      }

      const paramPath = `/portfolio/${stage}/stack/${paramName}`;
      const paramValue = params[paramName];

      try {
        // eslint-disable-next-line no-console
        console.log(`Uploading: ${paramPath} = ${paramValue} (to ${region})`);
        await this.putParameter(paramPath, paramValue, region);
        uploadCount++;
      } catch (error) {
        console.error(`Error: Failed to upload ${paramName} to ${region}: ${error}`);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      // eslint-disable-next-line no-console
      console.log(`✅ Successfully uploaded ${uploadCount} parameters to ${region}`);
    } else {
      console.error(`⚠️ Uploaded ${uploadCount} parameters to ${region} with ${errorCount} errors`);
    }
    return errorCount;
  }

  simulateUploadParameters(
    stage: Stage,
    params: Record<string, string>,
    region: string,
    verbose: boolean = false
  ): number {
    const regionParams = PARAMETER_SCHEMA[stage][region];
    if (!regionParams || regionParams.length === 0) {
      this.logVerbose(verbose, `No parameters configured for ${stage} in ${region}`);
      return 0;
    }

    // eslint-disable-next-line no-console
    console.log(`[DRY-RUN] Would upload stack parameters for ${stage} stage to ${region}...`);
    let errorCount = 0;

    for (const paramName of regionParams) {
      this.logVerbose(verbose, `Processing parameter: ${paramName}`);
      if (!params[paramName]) {
        console.warn(`Warning: Parameter ${paramName} not found in environment files`);
        errorCount++;
        continue;
      }

      const paramPath = `/portfolio/${stage}/stack/${paramName}`;
      const paramValue = params[paramName];
      // eslint-disable-next-line no-console
      console.log(`[DRY-RUN] Would upload: ${paramPath} = ${paramValue} (to ${region})`);
    }
    return errorCount;
  }

  async getParameters(
    stage: Stage,
    region: string,
    verbose: boolean = false
  ): Promise<Record<string, string>> {
    this.logVerbose(verbose, `Downloading parameters from region: ${region}`);
    const path = `/portfolio/${stage}/stack`;
    const params: Record<string, string> = {};

    try {
      const ssmParams = await this.getParametersByPath(path, region);
      for (const param of ssmParams) {
        if (param.Name && param.Value) {
          const paramName = param.Name.split('/').pop() as string;
          params[paramName] = param.Value;
          this.logVerbose(verbose, `Downloaded: ${paramName} = ${param.Value}`);
        }
      }
    } catch (error) {
      console.error(`Error getting parameters from ${region}: ${error}`);
    }
    return params;
  }

  // Data Management Operations
  async loadLocalData(stage: string): Promise<IDataCollection<IDataItem>> {
    const localPath = DATA_CONFIG.localPathTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(this.config.projectRoot, localPath);
    const collections: IDataCollection<IDataItem> = {};

    try {
      for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
        const filePath = path.join(dataDir, fileName);
        const content = await fs.readFile(filePath, 'utf-8');
        collections[key] = JSON.parse(content) as IDataItem[];
      }
      return collections;
    } catch (error) {
      throw new Error(
        `Failed to load data files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async uploadDataToS3(
    stage: string,
    bucketName: string,
    data: IDataCollection<IDataItem>,
    region: string
  ): Promise<void> {
    for (const [key, items] of Object.entries(data)) {
      const fileName = DATA_CONFIG.dataFiles[key as keyof typeof DATA_CONFIG.dataFiles];
      if (!fileName) {
        throw new Error(`Unknown data collection: ${key}`);
      }
      const s3Key = DATA_CONFIG.s3PathTemplate
        .replace('{stage}', stage)
        .replace('{fileName}', fileName);
      await this.uploadJsonToS3(bucketName, s3Key, items, region);
    }
    // eslint-disable-next-line no-console
    console.log(`✅ Uploaded data to s3://${bucketName}/${stage}/`);
  }

  async downloadDataFromS3(
    stage: string,
    bucketName: string,
    region: string
  ): Promise<IDataCollection<IDataItem>> {
    const collections: IDataCollection<IDataItem> = {};
    for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
      const s3Key = DATA_CONFIG.s3PathTemplate
        .replace('{stage}', stage)
        .replace('{fileName}', fileName);
      collections[key] = await this.downloadJsonFromS3<IDataItem[]>(bucketName, s3Key, region);
    }
    return collections;
  }

  async saveLocalData(data: IDataCollection<IDataItem>, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    for (const [key, items] of Object.entries(data)) {
      const fileName = DATA_CONFIG.dataFiles[key as keyof typeof DATA_CONFIG.dataFiles];
      if (!fileName) {
        throw new Error(`Unknown data collection: ${key}`);
      }
      await fs.writeFile(path.join(outputDir, fileName), JSON.stringify(items, null, 2));
    }
    // eslint-disable-next-line no-console
    console.log(`✅ Data saved to ${outputDir}`);
  }

  // CloudFormation Operations
  async getStackOutput(stackName: string, outputKey: string, region: string): Promise<string> {
    const client = new CloudFormationClient({ region });
    const command = new DescribeStacksCommand({ StackName: stackName });

    try {
      const response = await client.send(command);
      const stack = response.Stacks?.[0];
      if (!stack) {
        throw new Error(`Stack ${stackName} not found`);
      }

      const output = stack.Outputs?.find((o) => o.OutputKey === outputKey);
      if (!output?.OutputValue) {
        throw new Error(`Output ${outputKey} not found in stack ${stackName}`);
      }

      return output.OutputValue;
    } catch (error) {
      throw new Error(`Failed to get stack output: ${error}`);
    }
  }

  // CloudFront Operations
  async invalidateDistribution(
    distributionId: string,
    region: string = 'us-east-1'
  ): Promise<void> {
    const client = new CloudFrontClient({ region });
    const command = new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: ['/*']
        },
        CallerReference: `invalidation-${Date.now()}`
      }
    });

    try {
      await client.send(command);
      // eslint-disable-next-line no-console
      console.log(`✅ CloudFront invalidation created for distribution ${distributionId}`);
    } catch (error) {
      throw new Error(`Failed to invalidate distribution: ${error}`);
    }
  }

  // S3 Directory Sync Operations
  async syncDirectoryToS3(localDir: string, bucketName: string, region: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`Syncing directory ${localDir} to s3://${bucketName}/`);

    // Check if directory exists
    try {
      await fs.access(localDir);
    } catch (err) {
      console.error('Error: Local directory does not exist', err);
      throw new Error(`Local directory does not exist: ${localDir}`);
    }

    // Check if directory has files
    const dirContents = await fs.readdir(localDir);
    if (dirContents.length === 0) {
      console.warn(`Warning: Directory ${localDir} is empty, nothing to sync`);
      return;
    }

    try {
      // Content type resolver function to set proper MIME types based on file extensions
      const contentTypeResolver = (filePath: string): string | undefined => {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: Record<string, string> = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.txt': 'text/plain',
          '.ttf': 'font/ttf',
          '.otf': 'font/otf',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.xml': 'application/xml',
          '.pdf': 'application/pdf',
          '.webp': 'image/webp'
        };
        return contentTypes[ext];
      };

      // Upload files manually with correct content types
      const uploadFiles = async (dir: string, baseDir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await uploadFiles(fullPath, baseDir);
          } else {
            const relativePath = path.relative(baseDir, fullPath);
            const s3Key = relativePath.replace(/\\/g, '/'); // Convert Windows paths to S3 paths
            const contentType = contentTypeResolver(fullPath);

            const fileContent = await fs.readFile(fullPath);

            await new S3Client({ region }).send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType || 'application/octet-stream'
              })
            );

            // eslint-disable-next-line no-console
            console.log(
              `Uploaded ${s3Key} with content type ${contentType || 'application/octet-stream'}`
            );
          }
        }
      };

      await uploadFiles(localDir, localDir);

      // eslint-disable-next-line no-console
      console.log(`✅ Synced files to s3://${bucketName}/`);
    } catch (error) {
      throw new Error(
        `Failed to sync directory to S3: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
