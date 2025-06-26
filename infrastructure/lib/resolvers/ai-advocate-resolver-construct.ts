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

    // Create Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: `ai-advocate-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ai-advocate')),
      environment: {
        MATCHING_TABLE_NAME: props.jobMatchingTable.tableName,
        BEDROCK_MODEL_ID: props.bedrockModelId || 'amazon.titan-text-express-v1'
      },
      timeout: cdk.Duration.seconds(30), // Increased timeout for AI operations
      memorySize: 512 // Increased memory for AI operations
    });

    // Grant DynamoDB read access
    props.jobMatchingTable.grantReadData(this.function);

    // Grant Bedrock access for AI functionality
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'] // Scope this down to specific models in production
      })
    );

    // Create data source
    this.dataSource = props.api.addLambdaDataSource('AIAdvocateDataSource', this.function);

    // Create resolvers
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
