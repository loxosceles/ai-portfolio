import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { getRequiredEnvVars } from './stack-helpers';
import { getSupportedModels } from '../resolvers/supported-models';
import { AIAdvocateResolverConstruct } from '../resolvers/ai-advocate-resolver-construct';

interface IAIAdvocateStackProps extends cdk.StackProps {
  developerTable: dynamodb.ITable;
  projectsTable: dynamodb.ITable;
  stage: 'dev' | 'prod';
}

export class AIAdvocateStack extends cdk.Stack {
  public readonly aiAdvocateLambda: lambda.Function;
  private readonly stage: string;

  public readonly recruiterProfilesTable: dynamodb.Table;
  private recruiterProfilesTableName: string;

  constructor(scope: Construct, id: string, props: IAIAdvocateStackProps) {
    super(scope, id, props);
    const { developerTable, projectsTable, stage } = props;

    // Import the GraphQL API using CloudFormation exports
    const apiId = cdk.Fn.importValue(`GraphQLApiId-${stage}`);
    const api = appsync.GraphqlApi.fromGraphqlApiAttributes(this, 'ImportedApi', {
      graphqlApiId: apiId,
      graphqlApiArn: `arn:aws:appsync:${this.region}:${this.account}:apis/${apiId}`
    });
    this.stage = stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    // Validate required props
    if (!api) {
      throw new Error('api is required');
    }
    if (!developerTable) {
      throw new Error('developerTable is required');
    }
    if (!projectsTable) {
      throw new Error('projectsTable is required');
    }
    // Get required environment variables
    const { developerTableName, projectsTableName, bedrockModelId, recruiterProfilesTableName } =
      getRequiredEnvVars(
        [
          'DEVELOPER_TABLE_NAME',
          'PROJECTS_TABLE_NAME',
          'BEDROCK_MODEL_ID',
          'RECRUITER_PROFILES_TABLE_NAME'
        ],
        this.stage
      );

    this.recruiterProfilesTableName = recruiterProfilesTableName;

    // Create RecruiterProfiles table
    const isProd = stage === 'prod';
    this.recruiterProfilesTable = this.createRecruiterProfilesTable(isProd);

    // Validate the model ID
    const supportedModels = getSupportedModels();
    if (!supportedModels.includes(bedrockModelId)) {
      throw new Error(
        `Unsupported model: ${bedrockModelId}. Supported models: ${supportedModels.join(', ')}`
      );
    }

    // Create AI Advocate Lambda function
    this.aiAdvocateLambda = this.createAIAdvocateLambda(
      developerTableName,
      projectsTableName,
      bedrockModelId
    );

    // Grant DynamoDB permissions
    this.grantDynamoDBPermissions(developerTable, projectsTable);

    // Grant Bedrock permissions
    this.grantBedrockPermissions(bedrockModelId);

    // The schema is already defined in the API, we just need to add resolvers for AI operations

    // Create AppSync resolvers using the construct
    new AIAdvocateResolverConstruct(this, 'AIAdvocateResolver', {
      api,
      aiAdvocateLambda: this.aiAdvocateLambda
    });
  }

  private createAIAdvocateLambda(
    developerTableName: string,
    projectsTableName: string,
    bedrockModelId: string
  ): lambda.Function {
    return new lambda.Function(this, 'AIAdvocateFunction', {
      functionName: `ai-advocate-${this.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ai-advocate')),
      environment: {
        DEVELOPER_TABLE_NAME: `${developerTableName}-${this.stage}`,
        PROJECTS_TABLE_NAME: `${projectsTableName}-${this.stage}`,
        RECRUITER_PROFILES_TABLE_NAME: this.recruiterProfilesTable.tableName,
        BEDROCK_MODEL_ID: bedrockModelId
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512
    });
  }

  private grantDynamoDBPermissions(
    developerTable: dynamodb.ITable,
    projectsTable: dynamodb.ITable
  ): void {
    // Grant read access to data tables
    developerTable.grantReadData(this.aiAdvocateLambda);
    projectsTable.grantReadData(this.aiAdvocateLambda);

    // Grant read/write access to recruiter profiles table for conversation history
    this.recruiterProfilesTable.grantReadWriteData(this.aiAdvocateLambda);
  }

  private grantBedrockPermissions(bedrockModelId: string): void {
    this.aiAdvocateLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [`arn:aws:bedrock:eu-central-1::foundation-model/${bedrockModelId}`]
      })
    );
  }

  /**
   * Creates the RecruiterProfiles table with enhanced schema
   * @param isProd Whether this is a production deployment
   * @returns The created DynamoDB table
   */
  private createRecruiterProfilesTable(isProd: boolean): dynamodb.Table {
    return new dynamodb.Table(this, 'RecruiterProfilesTable', {
      tableName: `${this.recruiterProfilesTableName}-${this.stage}`,
      partitionKey: { name: 'linkId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd }
    });
  }
}
