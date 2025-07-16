import { SSMClient, PutParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
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
    const command = new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true
    });

    try {
      const response = await client.send(command);
      return response.Parameters || [];
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
        console.log(`Uploading: ${paramPath} = ${paramValue} (to ${region})`);
        await this.putParameter(paramPath, paramValue, region);
        uploadCount++;
      } catch (error) {
        console.error(`Error: Failed to upload ${paramName} to ${region}: ${error}`);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      console.log(`✅ Successfully uploaded ${uploadCount} parameters to ${region}`);
    } else {
      console.log(`⚠️ Uploaded ${uploadCount} parameters to ${region} with ${errorCount} errors`);
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
  async loadLocalData(stage: string): Promise<DataCollection<DataItem>> {
    const localPath = DATA_CONFIG.localPathTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(this.config.projectRoot, localPath);
    const collections: DataCollection<DataItem> = {};

    try {
      for (const [key, fileName] of Object.entries(DATA_CONFIG.dataFiles)) {
        const filePath = path.join(dataDir, fileName);
        const content = await fs.readFile(filePath, 'utf-8');
        collections[key] = JSON.parse(content) as DataItem[];
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
    data: DataCollection<DataItem>,
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
      collections[key] = await this.downloadJsonFromS3<DataItem[]>(bucketName, s3Key, region);
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
      console.log(`✅ CloudFront invalidation created for distribution ${distributionId}`);
    } catch (error) {
      throw new Error(`Failed to invalidate distribution: ${error}`);
    }
  }

  // S3 Directory Sync Operations
  async syncDirectoryToS3(localDir: string, bucketName: string, region: string): Promise<void> {
    const s3Client = new S3Client({ region });
    const glob = require('glob');

    // Get existing objects in bucket
    const existingObjects = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName
      })
    );

    // Upload local files
    const files = glob.sync('**/*', { cwd: localDir, nodir: true });
    const uploadedKeys = new Set<string>();

    for (const file of files) {
      const filePath = path.join(localDir, file);
      const content = await fs.readFile(filePath);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: file,
          Body: content,
          ContentType: this.getContentType(file)
        })
      );

      uploadedKeys.add(file);
    }

    // Delete removed files (--delete flag)
    if (existingObjects.Contents) {
      for (const obj of existingObjects.Contents) {
        if (obj.Key && !uploadedKeys.has(obj.Key)) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: obj.Key
            })
          );
        }
      }
    }

    console.log(`✅ Synced ${files.length} files to s3://${bucketName}/`);
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    return types[ext] || 'application/octet-stream';
  }
}
