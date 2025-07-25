import {
  SSMClient,
  PutParameterCommand,
  GetParametersByPathCommand,
  DeleteParameterCommand
} from '@aws-sdk/client-ssm';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { BaseManager } from './base-manager';
import { IAWSManagerConfig } from '../../types/config';
import { IDataItem, IDataCollection } from '../../types/data';
import { Stage } from '../../types/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * AWS Manager
 *
 * Unified manager for all AWS service operations
 */
export class AWSManager extends BaseManager {
  private awsConfig: IAWSManagerConfig;

  constructor(config: IAWSManagerConfig) {
    super(config);
    this.awsConfig = config;
  }

  /**
   * Validate region parameter
   */
  public validateRegion(region: string): string {
    if (!this.awsConfig.validRegions.includes(region)) {
      throw new Error(
        `Invalid region: ${region}. Valid regions: ${this.awsConfig.validRegions.join(', ')}`
      );
    }
    return region;
  }

  /**
   * Get regions for current stage from parameter schema
   */
  public getRegionsForStage(): string[] {
    const stageSchema = this.awsConfig.parameterSchema[this.getStage()];
    return Object.keys(stageSchema);
  }

  /**
   * Get region for specific service
   */
  public getRegionForService(service: string): string {
    return this.awsConfig.serviceRegions[service];
  }

  /**
   * Get stack name for specific service
   */
  public getStackNameForService(service: string): string {
    return `${this.awsConfig.stackPrefixes[service]}-${this.getStage()}`;
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

  async deleteParameter(name: string, region: string): Promise<void> {
    const client = new SSMClient({ region });
    const command = new DeleteParameterCommand({ Name: name });
    await client.send(command);
  }

  async deleteParametersByPath(
    path: string,
    region: string,
    verbose: boolean = false
  ): Promise<number> {
    const parameters = await this.getParametersByPath(path, region);
    let deleteCount = 0;

    for (const param of parameters) {
      if (param.Name) {
        try {
          await this.deleteParameter(param.Name, region);
          deleteCount++;
          this.logVerbose(verbose, `Deleted: ${param.Name}`);
        } catch (error) {
          console.error(`Failed to delete ${param.Name}: ${error}`);
        }
      }
    }

    return deleteCount;
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
        nextToken = response.NextToken;
      } while (nextToken);

      return allParameters;
    } catch (error) {
      console.error(`Error getting parameters by path ${path}: ${error}`);
      return [];
    }
  }

  // CloudFormation Operations
  async getStackOutputs(
    stackName: string,
    region: string
  ): Promise<Array<{ OutputKey: string; OutputValue: string }>> {
    const client = new CloudFormationClient({ region });
    try {
      const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
      return (
        response.Stacks?.[0]?.Outputs?.map((output) => ({
          OutputKey: output.OutputKey || '',
          OutputValue: output.OutputValue || ''
        })) || []
      );
    } catch (error) {
      console.error(`Error getting stack outputs for ${stackName}: ${error}`);
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

  // Data Management Operations

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
