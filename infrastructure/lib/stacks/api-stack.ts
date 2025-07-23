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
import { addStackOutputs, getRequiredEnvVars } from './stack-helpers';

interface IApiStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  stage: 'dev' | 'prod';
}

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  private readonly stage: string;
  private developerTableName: string;
  private projectsTableName: string;
  private dataBucketName: string;
  private awsRegionDefault: string;

  public readonly developerTable: dynamodb.Table;
  public readonly projectsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: IApiStackProps) {
    super(scope, id, props);
    const { stage, userPool } = props;
    this.stage = stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    if (!userPool) {
      throw new Error('userPool is required');
    }

    // Get required environment variables
    const { developerTableName, projectsTableName, dataBucketName, awsRegionDefault } =
      getRequiredEnvVars(
        ['DEVELOPER_TABLE_NAME', 'PROJECTS_TABLE_NAME', 'DATA_BUCKET_NAME', 'AWS_REGION_DEFAULT'],
        this.stage
      );
    this.developerTableName = developerTableName;
    this.projectsTableName = projectsTableName;
    this.dataBucketName = dataBucketName;
    this.awsRegionDefault = awsRegionDefault;

    // Create AppSync API
    this.api = this.createAppSyncApi(userPool);
    const isProd = this.stage === 'prod';

    // Create DynamoDB tables
    const tables = this.createDynamoDBTables(isProd);
    this.developerTable = tables.developerTable;
    this.projectsTable = tables.projectsTable;

    // Create AppSync DataSources
    const dataSources = this.createDataSources(this.developerTable, this.projectsTable);

    // Add resolvers using construct
    new APIResolverConstruct(this, 'APIResolvers', {
      api: this.api,
      developerDataSource: dataSources.developerDS,
      projectsDataSource: dataSources.projectsDS
    });

    // Create data loader to populate DynamoDB tables from S3
    this.createDataLoader(this.developerTable, this.projectsTable);

    // Export GraphQL API ID and URL for cross-stack references
    new cdk.CfnOutput(this, 'GraphQLApiId', {
      value: this.api.apiId,
      exportName: `GraphQLApiId-${this.stage}`
    });

    new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: this.api.graphqlUrl,
      exportName: `GraphQLApiUrl-${this.stage}`
    });

    // Add API outputs
    addStackOutputs(this, this.stage, [
      {
        id: 'AppSyncApiUrl',
        value: this.api.graphqlUrl,
        description: 'The URL of the GraphQL API',
        exportName: `appsync-url-${this.stage}`,
        paramName: 'APPSYNC_URL'
      },
      {
        id: 'AppSyncApiKey',
        value: this.api.apiKey || '',
        description: 'API Key for development access',
        exportName: `appsync-api-key-${this.stage}`,
        paramName: 'APPSYNC_API_KEY'
      },
      {
        id: 'AwsRegionDefault',
        value: this.region,
        description: 'AWS default region for services',
        exportName: `aws-region-default-${this.stage}`,
        paramName: 'AWS_REGION_DEFAULT'
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
      tableName: `${this.developerTableName}-${this.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    const projectsTable = new dynamodb.Table(this, 'ProjectsTable', {
      tableName: `${this.projectsTableName}-${this.stage}`,
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

  /**
   * Creates a Lambda function that loads data from S3 to DynamoDB tables.
   * This is triggered during CloudFormation deployment via a custom resource.
   */
  private createDataLoader(developerTable: dynamodb.Table, projectsTable: dynamodb.Table) {
    // Reference the existing S3 bucket
    const dataBucket = s3.Bucket.fromBucketName(this, 'DataBucket', this.dataBucketName);

    // Create the data loader Lambda
    const dataLoaderLambda = new lambda.Function(this, 'DataLoaderFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/data-loader')),
      timeout: cdk.Duration.minutes(5),
      environment: {
        ENVIRONMENT: this.stage,
        DATA_BUCKET_NAME: this.dataBucketName,
        DEVELOPER_TABLE_NAME: `${this.developerTableName}-${this.stage}`,
        PROJECTS_TABLE_NAME: `${this.projectsTableName}-${this.stage}`,
        AWS_REGION_DEFAULT: this.awsRegionDefault
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
