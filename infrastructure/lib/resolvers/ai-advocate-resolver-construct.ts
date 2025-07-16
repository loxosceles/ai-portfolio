import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface IAIAdvocateResolverProps {
  api: appsync.GraphqlApi;
  jobMatchingTable: dynamodb.ITable;
  recruiterProfilesTable: dynamodb.ITable;
  developerTable: dynamodb.ITable;
  projectsTable: dynamodb.ITable;
  stage: string;
  bedrockModelId: string;
}

export class AIAdvocateResolverConstruct extends Construct {
  public readonly dataSource: appsync.LambdaDataSource;

  constructor(scope: Construct, id: string, props: IAIAdvocateResolverProps) {
    super(scope, id);

    // Destructure all props first
    const {
      api,
      jobMatchingTable,
      recruiterProfilesTable,
      developerTable,
      projectsTable,
      stage,
      bedrockModelId
    } = props;

    // Validate all required props - no fallbacks
    if (!bedrockModelId) {
      throw new Error('bedrockModelId is required for AI Advocate resolver');
    }
    if (!jobMatchingTable.tableName) {
      throw new Error('jobMatchingTable.tableName is required');
    }
    if (!recruiterProfilesTable.tableName) {
      throw new Error('recruiterProfilesTable.tableName is required');
    }
    if (!developerTable.tableName) {
      throw new Error('developerTable.tableName is required');
    }
    if (!projectsTable.tableName) {
      throw new Error('projectsTable.tableName is required');
    }

    // Validate the model ID
    const supportedModels = getSupportedModels();
    if (!supportedModels.includes(bedrockModelId)) {
      throw new Error(
        `Unsupported model: ${bedrockModelId}. Supported models: ${supportedModels.join(', ')}`
      );
    }

    // Create Lambda function
    this.aiAdvocateLambdaFunction = new lambda.Function(this, 'AIAdvocateFunction', {
      functionName: `ai-advocate-${stage}`,
      runtime: lambda.Runtime.NODEJS_22_X, // Updated to Node.js 22
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ai-advocate')),
      environment: {
        MATCHING_TABLE_NAME: jobMatchingTable.tableName,
        DEVELOPER_TABLE_NAME: developerTable.tableName,
        PROJECTS_TABLE_NAME: projectsTable.tableName,
        RECRUITER_PROFILES_TABLE_NAME: recruiterProfilesTable.tableName,
        BEDROCK_MODEL_ID: bedrockModelId
      },
      timeout: cdk.Duration.seconds(30), // Increased timeout for AI operations
      memorySize: 512 // Increased memory for AI operations
    });

    // Grant DynamoDB read access
    jobMatchingTable.grantReadData(this.aiAdvocateLambdaFunction);
    developerTable.grantReadData(this.aiAdvocateLambdaFunction);

    // Grant access to projects table (needed for AI advocate to fetch developer projects)
    projectsTable.grantReadData(this.aiAdvocateLambdaFunction);

    // Grant read/write access to recruiter profiles table
    recruiterProfilesTable.grantReadWriteData(this.aiAdvocateLambdaFunction);

    // Grant Bedrock permissions for the specific model ID
    // Note: Bedrock availability varies by AWS account - ensure your account has access to Bedrock in eu-central-1
    this.aiAdvocateLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [`arn:aws:bedrock:eu-central-1::foundation-model/${bedrockModelId}`]
      })
    );

    // Create data source
    this.dataSource = api.addLambdaDataSource(
      'AIAdvocateDataSource',
      this.aiAdvocateLambdaFunction
    );

    this.dataSource.createResolver('GetAdvocateGreetingResolver', {
      typeName: 'Query',
      fieldName: 'getAdvocateGreeting'
    });

    this.dataSource.createResolver('GetAdvocateGreetingByLinkIdResolver', {
      typeName: 'Query',
      fieldName: 'getAdvocateGreetingByLinkId'
    });

    this.dataSource.createResolver('AskAIQuestionResolver', {
      typeName: 'Query',
      fieldName: 'askAIQuestion'
    });

    // Add resolver for conversation reset
    this.dataSource.createResolver('ResetConversationResolver', {
      typeName: 'Mutation',
      fieldName: 'resetConversation'
    });
  }
}
