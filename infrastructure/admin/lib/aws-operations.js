import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import generator from 'generate-password';
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
    const dataPath = this.config.paths.dataTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(this.config.projectRoot, dataPath);
    await fs.mkdir(dataDir, { recursive: true });

    const results = {};

    for (const [type, typeConfig] of Object.entries(this.config.dataTypes)) {
      const items = await this.getAllItems(stage, type);

      let exportData;
      if (typeConfig.isSingle) {
        exportData = items.length > 0 ? [items[0]] : [{}];
      } else {
        exportData = items;
      }

      const filePath = path.resolve(dataDir, typeConfig.file);
      // Sort object keys for consistent git diffs
      const sortedData = this.sortObjectKeys(exportData);
      await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2) + '\n');

      results[type] = {
        items: typeConfig.isSingle ? (items.length > 0 ? 1 : 0) : items.length,
        file: typeConfig.file
      };
    }

    return results;
  }

  // Sort object keys recursively for consistent JSON output
  sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
        });
      return sorted;
    }
    return obj;
  }

  async getSSMParameter(env, paramName) {
    try {
      const command = new GetParameterCommand({
        Name: `/portfolio/${env}/${paramName}`
      });

      const response = await this.ssmClient.send(command);
      return response.Parameter.Value;
    } catch (error) {
      console.error(`Error getting SSM parameter ${paramName}:`, error);
      throw new Error(`Failed to get SSM parameter: ${error.message}`);
    }
  }

  async createCognitoUser(env, linkId, cognitoConfig) {
    try {
      // Get Cognito configuration from provided config
      const userPoolId = await this.getSSMParameter(env, cognitoConfig.userPoolParam);
      const region = cognitoConfig.region || this.config.regions.dynamodb;

      const client = new CognitoIdentityProviderClient({ region });
      const username = `${linkId}@visitor.temporary.com`;
      const password = generator.generate({
        length: 16,
        numbers: true,
        symbols: true,
        uppercase: true,
        lowercase: true,
        strict: true,
        exclude: '"\`\'\\${}[]()!?><|&;*'
      });

      // Create user
      const createCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: username },
          { Name: 'email_verified', Value: 'true' }
        ]
      });

      await client.send(createCommand);

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        Password: password,
        Permanent: true
      });

      await client.send(setPasswordCommand);

      return {
        success: true,
        username,
        password
      };
    } catch (error) {
      console.error('Error creating Cognito user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AWSOperations;
