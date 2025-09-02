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
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { nanoid } from 'nanoid';
import generator from 'generate-password';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Password exclusion characters to avoid issues with various systems
// - Quotes (", ', `) can interfere with JSON parsing and shell commands
// - Backslash (\) can cause escaping issues
// - Dollar sign ($) can interfere with shell variable expansion
// - Angle brackets (<, >) can interfere with shell redirection
// - Pipe (|) and ampersand (&) can interfere with shell operations
// - Semicolon (;) can interfere with command separation
// - Asterisk (*) can interfere with shell globbing
// - Exclamation (!) can interfere with shell history expansion
// - Question mark (?) can interfere with shell globbing
// Note: Parentheses and brackets are excluded for consistency but could be reconsidered
const PASSWORD_EXCLUDE_CHARS = '"\`\'\\${}[]()!?><|&;*';

class AWSOperations {
  constructor(config) {
    this.config = config;
    this.ddbClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: config.regions.dynamodb
      })
    );
    this.ssmClient = new SSMClient({ region: config.regions.ssm });
    this.tableNamesCache = new Map();
  }

  async getTableNames(stage) {
    const disableCache = process.env.ENVIRONMENT === 'test';
    
    if (!disableCache && this.tableNamesCache.has(stage)) {
      return this.tableNamesCache.get(stage);
    }

    const tableNames = {};
    for (const [tableName, tableConfig] of Object.entries(this.config.tables)) {
      const paramPath = this.config.paths.ssmTemplate
        .replace('{stage}', stage)
        .replace('{paramName}', tableConfig.ssmParam);

      const result = await this.ssmClient.send(new GetParameterCommand({ Name: paramPath }));
      tableNames[tableName] = result.Parameter.Value;
    }

    if (!disableCache) {
      this.tableNamesCache.set(stage, tableNames);
    }
    return tableNames;
  }

  async getAllItems(stage, tableName) {
    const tableNames = await this.getTableNames(stage);
    const result = await this.ddbClient.send(
      new ScanCommand({
        TableName: tableNames[tableName]
      })
    );
    return result.Items || [];
  }

  // Create new item - prevents creation in developer table
  async createItem(stage, tableName, item) {
    if (tableName === 'developer') {
      throw new Error('Cannot create new items in developer table. Use updateItem instead.');
    }
    
    const tableNames = await this.getTableNames(stage);
    await this.ddbClient.send(new PutCommand({ 
      TableName: tableNames[tableName], 
      Item: item 
    }));
  }

  // Update existing item - ensures developer profile exists before updating
  async updateItem(stage, tableName, item) {
    if (tableName === 'developer') {
      const existing = await this.getAllItems(stage, tableName);
      if (existing.length === 0) {
        throw new Error('No developer profile exists. Create one through data import first.');
      }
    }
    
    const tableNames = await this.getTableNames(stage);
    await this.ddbClient.send(new PutCommand({ 
      TableName: tableNames[tableName], 
      Item: item 
    }));
  }

  // Delete item - prevents deletion from developer table
  async deleteItem(stage, tableName, key) {
    if (tableName === 'developer') {
      throw new Error('Cannot delete from developer table.');
    }
    
    const tableNames = await this.getTableNames(stage);
    await this.ddbClient.send(new DeleteCommand({ 
      TableName: tableNames[tableName], 
      Key: key 
    }));
  }

  // Helper to get correct key structure per table
  getItemKey(tableName, item) {
    switch (tableName) {
      case 'recruiters':
        return { linkId: item.linkId };
      case 'projects':
        return { id: item.id };
      default:
        throw new Error(`Cannot generate key for table: ${tableName}`);
    }
  }



  async exportToFiles(stage) {
    const dataPath = this.config.paths.dataTemplate.replace('{stage}', stage);
    const dataDir = path.resolve(this.config.projectRoot, dataPath);
    await fs.mkdir(dataDir, { recursive: true });

    const results = {};

    for (const [tableName, tableConfig] of Object.entries(this.config.tables)) {
      const items = await this.getAllItems(stage, tableName);

      const exportData = items;

      const filePath = path.resolve(dataDir, tableConfig.file);
      // Sort object keys for consistent git diffs
      const sortedData = this.sortObjectKeys(exportData);
      await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2) + '\n');

      results[tableName] = {
        items: items.length,
        file: tableConfig.file
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

  async createCognitoUser(env, recruiterId, cognitoConfig) {
    try {
      // Get Cognito configuration from provided config
      const userPoolId = await this.getSSMParameter(env, cognitoConfig.userPoolParam);
      const region = cognitoConfig.region || this.config.regions.dynamodb;

      const client = new CognitoIdentityProviderClient({ region });
      const username = `${recruiterId}@visitor.temporary.com`;
      const password = generator.generate({
        length: 16,
        numbers: true,
        symbols: true,
        uppercase: true,
        lowercase: true,
        strict: true,
        exclude: PASSWORD_EXCLUDE_CHARS
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
        password,
        recruiterId
      };
    } catch (error) {
      console.error('Error creating Cognito user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateInitialLink(env, recruiterId) {
    try {
      const lambdaClient = new LambdaClient({
        region: this.config.regions.dynamodb
      });

      const command = new InvokeCommand({
        FunctionName: `link-generator-${env}`,
        Payload: JSON.stringify({
          recruiterId
        })
      });

      const response = await lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      if (result.statusCode === 200) {
        const body = JSON.parse(result.body);
        return {
          success: true,
          linkId: body.linkId,
          link: body.link
        };
      } else {
        const errorBody = JSON.parse(result.body);
        throw new Error(errorBody.error || 'Link generation failed');
      }
    } catch (error) {
      console.error('Error generating initial link:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AWSOperations;
