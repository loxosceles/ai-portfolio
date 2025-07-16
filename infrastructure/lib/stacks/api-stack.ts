import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { APIResolverConstruct } from '../resolvers/api-resolver-construct';
import { Construct } from 'constructs';
import * as path from 'path';
import { addStackOutputs } from '../utils/stack-outputs';

interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  stage: 'dev' | 'prod';
  jobMatchingTable: dynamodb.ITable;
  recruiterProfilesTable: dynamodb.ITable;
  bedrockModelId: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { stage, userPool, jobMatchingTable, recruiterProfilesTable, bedrockModelId } = props;
    this.stage = stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    if (!userPool) {
      throw new Error('userPool is required');
    }

    if (!jobMatchingTable) {
      throw new Error('jobMatchingTable is required');
    }

    if (!recruiterProfilesTable) {
      throw new Error('recruiterProfilesTable is required');
    }

    if (!bedrockModelId) {
      throw new Error('bedrockModelId is required');
    }

    // Validate required environment variable for current stage
    const bucketEnvVar = `${stage.toUpperCase()}_DATA_BUCKET_NAME`;
    const dataBucketName = process.env[bucketEnvVar] as string | undefined;

    if (!dataBucketName) {
      throw new Error(`${bucketEnvVar} environment variable is required for ${stage} stage`);
    }

    // Create AppSync API
    this.api = this.createAppSyncApi(userPool);
    const isProd = this.stage === 'prod';

    // Create DynamoDB tables
    const { developerTable, projectsTable } = this.createDynamoDBTables(isProd);

    // Create AppSync DataSources
    const dataSources = this.createDataSources(developerTable, projectsTable);

    // Add resolvers
    this.createResolvers(dataSources);

    // Create AI-powered resolvers (separate from basic CRUD operations)
    this.createAIResolvers(
      jobMatchingTable,
      recruiterProfilesTable,
      bedrockModelId,
      developerTable,
      projectsTable
    );

    // Create data loader to populate DynamoDB tables from S3
    this.createDataLoader(developerTable, projectsTable);

    // Add API outputs
    addStackOutputs(this, this.stage, [
      {
        id: 'AppSyncApiUrl',
        value: this.api.graphqlUrl,
        description: 'The URL of the GraphQL API',
        exportName: `appsync-url-${this.stage}`,
        paramName: 'NEXT_PUBLIC_APPSYNC_URL'
      },
      {
        id: 'AppSyncApiKey',
        value: this.api.apiKey || '',
        description: 'API Key for development access',
        exportName: `appsync-api-key-${this.stage}`,
        paramName: 'NEXT_PUBLIC_APPSYNC_API_KEY'
      },
      {
        id: 'AppSyncRegion',
        value: this.region,
        description: 'AWS Region for AppSync API',
        exportName: `appsync-region-${this.stage}`,
        paramName: 'NEXT_PUBLIC_AWS_REGION'
      }
    ]);
  }

  private createAppSyncApi(userPool: cognito.UserPool): appsync.GraphqlApi {
    // Create the AppSync API using the L2 construct
    const api = new appsync.GraphqlApi(this, 'PortfolioApi', {
      name: `portfolio-api-${this.stage}`,
      definition: appsync.Definition.fromSchema(
        appsync.SchemaFile.fromAsset(path.join(__dirname, '../schema/schema.graphql'))
      ),
      authorizationConfig: {
        defaultAuthorization: {
          // Use API_KEY as default for public queries
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365))
          }
        },
        additionalAuthorizationModes: [
          // For authenticated queries: USER_POOL only
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: { userPool }
          }
        ]
      },
      xrayEnabled: false
    });

    return api;
  }

  private createDynamoDBTables(isProd: boolean) {
    const developerTable = new dynamodb.Table(this, 'DeveloperTable', {
      tableName: `PortfolioDevelopers-${this.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    const projectsTable = new dynamodb.Table(this, 'ProjectsTable', {
      tableName: `PortfolioProjects-${this.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    projectsTable.addGlobalSecondaryIndex({
      indexName: 'byDeveloperId',
      partitionKey: { name: 'developerId', type: dynamodb.AttributeType.STRING }
    });

    return { developerTable, projectsTable };
  }

  private createDataSources(developerTable: dynamodb.Table, projectsTable: dynamodb.Table) {
    const developerDS = this.api.addDynamoDbDataSource('DeveloperDataSource', developerTable);
    const projectsDS = this.api.addDynamoDbDataSource('ProjectsDataSource', projectsTable);

    return { developerDS, projectsDS };
  }

  private createResolvers(dataSources: {
    developerDS: appsync.DynamoDbDataSource;
    projectsDS: appsync.DynamoDbDataSource;
  }) {
    // Custom resolver for getDeveloper with fixed key
    dataSources.developerDS.createResolver('GetDeveloperResolver', {
      typeName: 'Query',
      fieldName: 'getDeveloper',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "operation": "GetItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson("DEVELOPER_PROFILE")
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    new DynamoDBResolverConstruct(this, 'UpdateDeveloper', {
      dataSource: dataSources.developerDS,
      typeName: 'Mutation',
      fieldName: 'updateDeveloper',
      operation: 'update'
    });

    // Project Resolvers (Public - API key)
    new DynamoDBResolverConstruct(this, 'GetProject', {
      dataSource: dataSources.projectsDS,
      typeName: 'Query',
      fieldName: 'getProject',
      operation: 'get'
    });

    new DynamoDBResolverConstruct(this, 'ListProjects', {
      dataSource: dataSources.projectsDS,
      typeName: 'Query',
      fieldName: 'listProjects',
      operation: 'list'
    });

    // For Developer.projects relationship (Public - no auth required)
    dataSources.projectsDS.createResolver('DeveloperProjectsResolver', {
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

    // For Project.developers relationship (Public - no auth required)
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
   */
  private createAIResolvers(
    jobMatchingTable: dynamodb.ITable,
    recruiterProfilesTable: dynamodb.ITable,
    bedrockModelId: string,
    developerTable: dynamodb.Table,
    projectsTable: dynamodb.Table
  ) {
    // Use the tables passed as parameters
    new AIAdvocateResolverConstruct(this, 'AIAdvocateResolver', {
      api: this.api,
      jobMatchingTable,
      recruiterProfilesTable,
      developerTable,
      projectsTable,
      stage: this.stage,
      bedrockModelId
    });
  }

  /**
   * Creates a Lambda function that loads data from S3 to DynamoDB tables.
   * This is triggered during CloudFormation deployment via a custom resource.
   */
  private createDataLoader(developerTable: dynamodb.Table, projectsTable: dynamodb.Table) {
    // Get bucket name from environment variables
    const bucketEnvVar = `${this.stage.toUpperCase()}_DATA_BUCKET_NAME`;
    const bucketName = process.env[bucketEnvVar] as string;

    // Reference the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', bucketName);

    // Create the data loader Lambda
    const dataLoaderLambda = new lambda.Function(this, 'DataLoaderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/data-loader')),
      timeout: cdk.Duration.minutes(5),
      environment: {
        ENVIRONMENT: this.stage,
        DATA_BUCKET_NAME: bucketName
      }
    });

    // Grant permissions to the Lambda
    dataBucket.grantRead(dataLoaderLambda);
    developerTable.grantWriteData(dataLoaderLambda);
    projectsTable.grantWriteData(dataLoaderLambda);

    // Create a custom resource to trigger the Lambda during deployment
    const dataLoaderProvider = new cr.Provider(this, 'DataLoaderProvider', {
      onEventHandler: dataLoaderLambda,
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    // Create the custom resource
    new cdk.CustomResource(this, 'DataLoaderResource', {
      serviceToken: dataLoaderProvider.serviceToken,
      properties: {
        environment: this.stage,
        // Add a timestamp to ensure the resource is updated on each deployment
        timestamp: new Date().toISOString()
      }
    });
  }
}
