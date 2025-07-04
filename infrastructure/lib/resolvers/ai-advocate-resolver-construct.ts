import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import { getSupportedModels } from './supported-models';

export interface AIAdvocateResolverProps {
  api: appsync.GraphqlApi;
  jobMatchingTable: dynamodb.ITable;
  recruiterProfilesTable?: dynamodb.ITable;
  developerTable: dynamodb.ITable;
  stage: string;
  bedrockModelId?: string;
}

export class AIAdvocateResolverConstruct extends Construct {
  public readonly dataSource: appsync.LambdaDataSource;
  public readonly aiAdvocateLambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AIAdvocateResolverProps) {
    super(scope, id);
    const isProd = props.stage === 'prod';

    // Validate Bedrock model ID
    if (!props.bedrockModelId) {
      throw new Error('bedrockModelId is required for AI Advocate resolver');
    }

    // Validate the model ID using our TypeScript adapter
    const supportedModels = getSupportedModels();
    const modelIdForValidation = props.bedrockModelId;

    if (!supportedModels.includes(modelIdForValidation)) {
      throw new Error(
        `Unsupported model: ${modelIdForValidation}. Supported models: ${supportedModels.join(', ')}`
      );
    }

    // Create Lambda function
    this.aiAdvocateLambdaFunction = new lambda.Function(this, 'AIAdvocateFunction', {
      functionName: `ai-advocate-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X, // Updated to Node.js 22
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ai-advocate')),
      environment: {
        MATCHING_TABLE_NAME: props.jobMatchingTable.tableName,
        DEVELOPER_TABLE_NAME: props.developerTable.tableName,
        RECRUITER_PROFILES_TABLE_NAME: props.recruiterProfilesTable?.tableName || '',
        BEDROCK_MODEL_ID: props.bedrockModelId
      },
      timeout: cdk.Duration.seconds(30), // Increased timeout for AI operations
      memorySize: 512 // Increased memory for AI operations
    });

    // Grant DynamoDB read access
    props.jobMatchingTable.grantReadData(this.aiAdvocateLambdaFunction);
    props.developerTable.grantReadData(this.aiAdvocateLambdaFunction);

    // Grant access to projects table (needed for AI advocate to fetch developer projects)
    const projectsTableArn = `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/PortfolioProjects-${props.stage}`;
    this.aiAdvocateLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query', 'dynamodb:Scan'],
        resources: [projectsTableArn]
      })
    );

    // Grant read/write access to recruiter profiles table if provided
    if (props.recruiterProfilesTable) {
      props.recruiterProfilesTable.grantReadWriteData(this.aiAdvocateLambdaFunction);
    }

    // In production, scope down to specific model; in dev allow broader access
    // Note: Bedrock availability varies by AWS account - ensure your account has access to Bedrock in eu-central-1
    const resources = isProd
      ? [`arn:aws:bedrock:eu-central-1::foundation-model/${props.bedrockModelId}`]
      : ['*'];

    this.aiAdvocateLambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: resources
      })
    );

    // Create data source
    this.dataSource = props.api.addLambdaDataSource(
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
