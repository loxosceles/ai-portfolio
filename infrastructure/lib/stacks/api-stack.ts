import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoDBResolverConstruct } from '../resolvers/dynamodb-resolver-construct';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  stage: 'dev' | 'prod';
}

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { stage, userPool } = props;

    // Create AppSync API
    this.api = this.createAppSyncApi(userPool, stage);
    const isProd = props.stage === 'prod';

    // Create DynamoDB tables
    const { developerTable, projectTable } = this.createDynamoDBTables(
      stage,
      isProd
    );

    // Create AppSync DataSources
    const dataSources = this.createDataSources(
      this.api,
      developerTable,
      projectTable
    );

    // Add resolvers
    this.createResolvers(dataSources);

    // Add API outputs
    this.addStackOutputs();
  }

  private createAppSyncApi(
    userPool: cognito.UserPool,
    stage: string
  ): appsync.GraphqlApi {
    // Base schema
    let schemaDefinition = fs.readFileSync(
      path.join(__dirname, '../schema/schema.graphql'),
      'utf8'
    );

    return new appsync.GraphqlApi(this, 'PortfolioApi', {
      name: `portfolio-api-${stage}`,
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, '../schema/schema.graphql')
      ),
      authorizationConfig: {
        defaultAuthorization: {
          // In prod, use USER_POOL as default
          authorizationType:
            stage === 'prod'
              ? appsync.AuthorizationType.USER_POOL
              : appsync.AuthorizationType.API_KEY,
          ...(stage === 'prod'
            ? { userPoolConfig: { userPool } }
            : {
                apiKeyConfig: {
                  expires: cdk.Expiration.after(cdk.Duration.days(365))
                }
              })
        },
        additionalAuthorizationModes: [
          stage === 'prod'
            ? {
                authorizationType: appsync.AuthorizationType.API_KEY,
                apiKeyConfig: {
                  expires: cdk.Expiration.after(cdk.Duration.days(365))
                }
              }
            : {
                authorizationType: appsync.AuthorizationType.USER_POOL,
                userPoolConfig: { userPool }
              }
        ]
      }
    });
  }

  private createDynamoDBTables(stage: string, isProd: boolean) {
    const developerTable = new dynamodb.Table(this, 'DeveloperTable', {
      tableName: `PortfolioDevelopers-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    const projectTable = new dynamodb.Table(this, 'ProjectTable', {
      tableName: `PortfolioProjects-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    return { developerTable, projectTable };
  }

  private createDataSources(
    api: appsync.GraphqlApi,
    developerTable: dynamodb.Table,
    projectTable: dynamodb.Table
  ) {
    const developerDS = api.addDynamoDbDataSource(
      'DeveloperDataSource',
      developerTable
    );
    const projectDS = api.addDynamoDbDataSource(
      'ProjectDataSource',
      projectTable
    );

    return { developerDS, projectDS };
  }

  private createResolvers(dataSources: {
    developerDS: appsync.DynamoDbDataSource;
    projectDS: appsync.DynamoDbDataSource;
  }) {
    // Developer Resolvers
    new DynamoDBResolverConstruct(this, 'GetDeveloper', {
      dataSource: dataSources.developerDS,
      typeName: 'Query',
      fieldName: 'getDeveloper',
      operation: 'get'
    });

    new DynamoDBResolverConstruct(this, 'ListDevelopers', {
      dataSource: dataSources.developerDS,
      typeName: 'Query',
      fieldName: 'listDevelopers',
      operation: 'list'
    });

    new DynamoDBResolverConstruct(this, 'CreateDeveloper', {
      dataSource: dataSources.developerDS,
      typeName: 'Mutation',
      fieldName: 'createDeveloper',
      operation: 'create'
    });

    new DynamoDBResolverConstruct(this, 'UpdateDeveloper', {
      dataSource: dataSources.developerDS,
      typeName: 'Mutation',
      fieldName: 'updateDeveloper',
      operation: 'update'
    });

    new DynamoDBResolverConstruct(this, 'DeleteDeveloper', {
      dataSource: dataSources.developerDS,
      typeName: 'Mutation',
      fieldName: 'deleteDeveloper',
      operation: 'delete'
    });

    // Project Resolvers
    new DynamoDBResolverConstruct(this, 'GetProject', {
      dataSource: dataSources.projectDS,
      typeName: 'Query',
      fieldName: 'getProject',
      operation: 'get'
    });

    new DynamoDBResolverConstruct(this, 'ListProjects', {
      dataSource: dataSources.projectDS,
      typeName: 'Query',
      fieldName: 'listProjects',
      operation: 'list'
    });

    // Custom relationship resolvers (kept as before)
    dataSources.projectDS.createResolver('DeveloperProjects', {
      typeName: 'Developer',
      fieldName: 'projects',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbQuery(
        appsync.KeyCondition.eq('developerId', 'id')
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    });

    dataSources.developerDS.createResolver('ProjectDeveloper', {
      typeName: 'Project',
      fieldName: 'developer',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        'id',
        'developerId'
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });
  }

  private addStackOutputs() {
    // AppSync Outputs
    new cdk.CfnOutput(this, 'AppSyncApiUrl', {
      value: this.api.graphqlUrl,
      description: 'The URL of the GraphQL API',
      exportName: 'AppSyncApiUrl'
    });

    new cdk.CfnOutput(this, 'AppSyncApiKey', {
      value: this.api.apiKey || '',
      description: 'API Key for development access',
      exportName: 'AppSyncApiKey'
    });

    // Add to environment variables
    this.addEnvOutputs();
  }

  private addEnvOutputs() {
    // Frontend environment variables
    new cdk.CfnOutput(this, 'NextPublicAppSyncUrl', {
      value: this.api.graphqlUrl,
      description: 'AppSync URL for frontend environment',
      exportName: 'next-public-appsync-url'
    });

    new cdk.CfnOutput(this, 'NextPublicAppSyncApiKey', {
      value: this.api.apiKey || '',
      description: 'AppSync API Key for frontend environment',
      exportName: 'next-public-appsync-api-key'
    });
  }
}
