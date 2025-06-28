import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { DynamoDBResolverConstruct } from '../resolvers/dynamodb-resolver-construct';
import { AIAdvocateResolverConstruct } from '../resolvers/ai-advocate-resolver-construct';
import { Construct } from 'constructs';
import * as path from 'path';
import { addStackOutputs } from '../utils/stack-outputs';

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  stage: 'dev' | 'prod';
  jobMatchingTable?: dynamodb.ITable;
  bedrockModelId?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { stage, userPool, jobMatchingTable } = props;
    this.stage = stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    // Create AppSync API
    this.api = this.createAppSyncApi(userPool, stage);
    const isProd = this.stage === 'prod';

    // Create DynamoDB tables
    const { developerTable, projectTable } = this.createDynamoDBTables(stage, isProd);

    // Create AppSync DataSources
    const dataSources = this.createDataSources(this.api, developerTable, projectTable);

    // Add resolvers
    this.createResolvers(dataSources);

    // Create AI-powered resolvers (separate from basic CRUD operations)
    this.createAIResolvers(jobMatchingTable, props.bedrockModelId);

    // Create data loader to populate DynamoDB tables from S3
    this.createDataLoader(stage, developerTable, projectTable);

    // Add API outputs
    addStackOutputs(this, stage, [
      {
        id: 'AppSyncApiUrl',
        value: this.api.graphqlUrl,
        description: 'The URL of the GraphQL API',
        exportName: `appsync-url-${stage}`,
        paramName: 'NEXT_PUBLIC_APPSYNC_URL'
      },
      {
        id: 'AppSyncApiKey',
        value: this.api.apiKey || '',
        description: 'API Key for development access',
        exportName: `appsync-api-key-${stage}`,
        paramName: 'NEXT_PUBLIC_APPSYNC_API_KEY'
      },
      {
        id: 'AppSyncRegion',
        value: this.region,
        description: 'AWS Region for AppSync API',
        exportName: `appsync-region-${stage}`,
        paramName: 'NEXT_PUBLIC_AWS_REGION'
      }
    ]);
  }

  private createAppSyncApi(userPool: cognito.UserPool, stage: string): appsync.GraphqlApi {
    // Create the AppSync API using the L2 construct
    const api = new appsync.GraphqlApi(this, 'PortfolioApi', {
      name: `portfolio-api-${stage}`,
      definition: appsync.Definition.fromSchema(
        appsync.SchemaFile.fromAsset(path.join(__dirname, '../schema/schema.graphql'))
      ),
      authorizationConfig: {
        defaultAuthorization: {
          // Use IAM (public) as default for queries
          authorizationType: appsync.AuthorizationType.IAM
        },
        additionalAuthorizationModes: [
          // For mutations in prod: USER_POOL
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: { userPool }
          },
          // For mutations in dev: API_KEY
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365))
            }
          }
        ]
      },
      // Enable X-Ray for tracing
      xrayEnabled: true
    });

    // Create IAM policy to allow public access to queries
    const publicAccessPolicy = new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: ['appsync:GraphQL'],
      resources: [`${api.arn}/types/Query/*`]
    });

    // Add policy to allow unauthenticated access to queries
    new cdk.aws_iam.Policy(this, 'PublicQueryAccess', {
      statements: [publicAccessPolicy]
    });

    return api;
  }

  private createDynamoDBTables(stage: string, isProd: boolean) {
    const developerTable = new dynamodb.Table(this, 'DeveloperTable', {
      tableName: `PortfolioDevelopers-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    const projectTable = new dynamodb.Table(this, 'ProjectTable', {
      tableName: `PortfolioProjects-${stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    projectTable.addGlobalSecondaryIndex({
      indexName: 'byDeveloperId',
      partitionKey: { name: 'developerId', type: dynamodb.AttributeType.STRING }
    });

    return { developerTable, projectTable };
  }

  private createDataSources(
    api: appsync.GraphqlApi,
    developerTable: dynamodb.Table,
    projectTable: dynamodb.Table
  ) {
    const developerDS = api.addDynamoDbDataSource('DeveloperDataSource', developerTable);
    const projectDS = api.addDynamoDbDataSource('ProjectDataSource', projectTable);

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

    // For Developer.projects relationship
    dataSources.projectDS.createResolver('DeveloperProjectsResolver', {
      typeName: 'Developer',
      fieldName: 'projects',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
    {
      "version": "2018-05-29",
      "operation": "Query",
      "query": {
        "expression": "developerId = :developerId",
        "expressionValues": {
          ":developerId": $util.dynamodb.toDynamoDBJson($ctx.source.id)
        }
      },
      "index": "byDeveloperId"
    }
  `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    });

    // For Project.developers relationship
    dataSources.developerDS.createResolver('ProjectDeveloperResolver', {
      typeName: 'Project',
      fieldName: 'developer',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'developerId'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });
  }

  /**
   * Creates AI-powered resolvers that use Lambda functions with external services.
   * These are separate from basic CRUD operations as they:
   * - Depend on external tables from other stacks
   * - Use Lambda data sources with complex logic (Bedrock AI)
   * - Are conditionally created based on feature availability
   */
  private createAIResolvers(jobMatchingTable?: dynamodb.ITable, bedrockModelId?: string) {
    if (jobMatchingTable) {
      new AIAdvocateResolverConstruct(this, 'AIAdvocateResolver', {
        api: this.api,
        jobMatchingTable,
        stage: this.stage,
        bedrockModelId
      });
    }
  }

  /**
   * Creates a Lambda function that loads data from S3 to DynamoDB tables.
   * This is triggered during CloudFormation deployment via a custom resource.
   */
  private createDataLoader(
    stage: string,
    developerTable: dynamodb.Table,
    projectTable: dynamodb.Table
  ) {
    // Determine bucket name based on stage
    const bucketName =
      stage === 'prod'
        ? process.env.PROD_DATA_BUCKET_NAME || 'portfolio-production-data'
        : process.env.DEV_DATA_BUCKET_NAME || 'portfolio-development-data';

    // Reference the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', bucketName);

    // Create the data loader Lambda
    const dataLoaderLambda = new lambda.Function(this, 'DataLoaderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/data-loader')),
      timeout: cdk.Duration.minutes(5),
      environment: {
        ENVIRONMENT: stage,
        PROD_DATA_BUCKET_NAME: process.env.PROD_DATA_BUCKET_NAME || 'portfolio-production-data',
        DEV_DATA_BUCKET_NAME: process.env.DEV_DATA_BUCKET_NAME || 'portfolio-development-data'
      }
    });

    // Grant permissions to the Lambda
    dataBucket.grantRead(dataLoaderLambda);
    developerTable.grantWriteData(dataLoaderLambda);
    projectTable.grantWriteData(dataLoaderLambda);

    // Create a custom resource to trigger the Lambda during deployment
    const dataLoaderProvider = new cr.Provider(this, 'DataLoaderProvider', {
      onEventHandler: dataLoaderLambda,
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    // Create the custom resource
    new cdk.CustomResource(this, 'DataLoaderResource', {
      serviceToken: dataLoaderProvider.serviceToken,
      properties: {
        environment: stage,
        // Add a timestamp to ensure the resource is updated on each deployment
        timestamp: new Date().toISOString()
      }
    });
  }
}
