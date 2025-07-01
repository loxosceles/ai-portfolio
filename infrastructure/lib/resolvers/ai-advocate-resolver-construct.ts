import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface AIAdvocateResolverProps {
  api: appsync.GraphqlApi;
  jobMatchingTable: dynamodb.ITable;
  stage: string;
  bedrockModelId?: string;
}

export class AIAdvocateResolverConstruct extends Construct {
  public readonly dataSource: appsync.LambdaDataSource;
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: AIAdvocateResolverProps) {
    super(scope, id);

    // Validate Bedrock model ID
    if (!props.bedrockModelId) {
      throw new Error('bedrockModelId is required for AI Advocate resolver');
    }
    const modelIdForValidation = props.bedrockModelId;

    // Import the ModelRegistry bridge to validate the model ID
    // This is more robust than parsing the file with regex
    try {
      // Use the bridge file which exposes ES module functionality to CommonJS
      const modelRegistryBridgePath = path.join(
        __dirname,
        '../functions/ai-advocate/adapters/model-registry-bridge.js'
      );

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const modelRegistryBridge = require(modelRegistryBridgePath);

      // Get the list of supported models directly from the bridge
      const supportedModels = modelRegistryBridge.getSupportedModels();

      if (!supportedModels.includes(modelIdForValidation)) {
        throw new Error(
          `Unsupported model: ${modelIdForValidation}. Supported models: ${supportedModels.join(', ')}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to validate model ID: ${error.message}`);
    }

    // Create Lambda function
    this.function = new lambda.Function(this, 'AIAdvocateFunction', {
      functionName: `ai-advocate-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ai-advocate')),
      environment: {
        MATCHING_TABLE_NAME: props.jobMatchingTable.tableName,
        BEDROCK_MODEL_ID: props.bedrockModelId
      },
      timeout: cdk.Duration.seconds(30), // Increased timeout for AI operations
      memorySize: 512 // Increased memory for AI operations
    });

    // Grant DynamoDB read access
    props.jobMatchingTable.grantReadData(this.function);

    // Grant Bedrock access for AI functionality
    const isProd = props.stage === 'prod';

    // In production, scope down to specific model; in dev allow broader access
    const resources = isProd
      ? [`arn:aws:bedrock:eu-central-1::foundation-model/${props.bedrockModelId}`]
      : ['*'];

    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: resources
      })
    );

    // Create data source
    this.dataSource = props.api.addLambdaDataSource('AIAdvocateDataSource', this.function);

    this.dataSource.createResolver('GetJobMatchingResolver', {
      typeName: 'Query',
      fieldName: 'getJobMatching'
    });

    this.dataSource.createResolver('GetJobMatchingByLinkIdResolver', {
      typeName: 'Query',
      fieldName: 'getJobMatchingByLinkId'
    });

    this.dataSource.createResolver('AskAIQuestionResolver', {
      typeName: 'Query',
      fieldName: 'askAIQuestion'
    });
  }
}
