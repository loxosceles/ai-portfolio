import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AWSOperations {
  constructor(config) {
    this.config = config;
    this.ddbClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: config.regions.dynamodb
      })
    );
    this.ssmClient = new SSMClient({ region: config.regions.ssm });
    this.tableNames = null;
  }

  async getTableNames(stage) {
    if (this.tableNames && this.tableNames._stage === stage) return this.tableNames;

    const tableNames = {};
    for (const [type, typeConfig] of Object.entries(this.config.dataTypes)) {
      const paramPath = this.config.paths.ssmTemplate
        .replace('{stage}', stage)
        .replace('{paramName}', typeConfig.ssmParam);

      const result = await this.ssmClient.send(new GetParameterCommand({ Name: paramPath }));
      tableNames[type] = result.Parameter.Value;
    }

    this.tableNames = { ...tableNames, _stage: stage };
    return tableNames;
  }

  async getAllItems(stage, type) {
    const tableNames = await this.getTableNames(stage);
    const result = await this.ddbClient.send(
      new ScanCommand({
        TableName: tableNames[type]
      })
    );
    return result.Items || [];
  }

  async saveItems(stage, type, data) {
    const tableNames = await this.getTableNames(stage);
    const tableName = tableNames[type];

    if (this.config.dataTypes[type].isSingle) {
      await this.ddbClient.send(new PutCommand({ TableName: tableName, Item: data }));
    } else {
      // Replace all items for arrays
      const existing = await this.getAllItems(stage, type);

      // Delete existing
      for (const item of existing) {
        const key = type === 'recruiters' ? { linkId: item.linkId } : { id: item.id };
        await this.ddbClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: key
          })
        );
      }

      // Insert new
      for (const item of data) {
        await this.ddbClient.send(new PutCommand({ TableName: tableName, Item: item }));
      }
    }
  }

  async exportToFiles(stage) {
    const dataDir = this.config.paths.dataDir.replace('{stage}', stage);
    await fs.mkdir(path.resolve(__dirname, dataDir), { recursive: true });

    const results = {};

    for (const [type, typeConfig] of Object.entries(this.config.dataTypes)) {
      const items = await this.getAllItems(stage, type);

      let exportData;
      if (typeConfig.isSingle) {
        exportData = items.length > 0 ? [items[0]] : [{}];
      } else {
        exportData = items;
      }

      const filePath = path.resolve(__dirname, dataDir, typeConfig.file);
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2) + '\n');

      results[type] = {
        items: typeConfig.isSingle ? (items.length > 0 ? 1 : 0) : items.length,
        file: typeConfig.file
      };
    }

    return results;
  }
}

export default AWSOperations;
