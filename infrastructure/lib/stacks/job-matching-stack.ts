import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { addStackOutputs } from '../utils/stack-outputs';

interface JobMatchingStackProps extends cdk.StackProps {
  userPool: cognito.UserPool;
  stage: 'dev' | 'prod';
  cloudfrontDomain: string;
}

export class JobMatchingStack extends cdk.Stack {
  public readonly matchingTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: JobMatchingStackProps) {
    super(scope, id, props);
    const { stage, userPool, cloudfrontDomain } = props;
    this.stage = stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    // Create DynamoDB table for job matching data
    this.matchingTable = this.createMatchingTable(stage === 'prod');

    // Create Lambda function for job matching
    const matchingFunction = this.createMatchingFunction(
      this.matchingTable,
      props.cloudfrontDomain
    );

    // Create API Gateway logging role
    const apiGatewayLoggingRole = this.createApiGatewayLoggingRole();

    // Create API Gateway with Cognito authorizer
    this.api = this.createApiGateway(
      userPool,
      matchingFunction,
      apiGatewayLoggingRole,
      props.cloudfrontDomain
    );

    // Add stack outputs
    this.addOutputs(stage);
  }

  private createMatchingTable(isProd: boolean): dynamodb.Table {
    return new dynamodb.Table(this, 'JobMatchingTable', {
      tableName: `JobMatching-${this.stage}`,
      partitionKey: { name: 'linkId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: isProd }
    });
  }

  private createMatchingFunction(table: dynamodb.Table, cloudfrontDomain: string): lambda.Function {
    // Create Lambda function
    const fn = new lambda.Function(this, 'JobMatchingFunction', {
      functionName: `job-matching-${this.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/job-matching')),
      environment: {
        MATCHING_TABLE_NAME: table.tableName,
        ALLOWED_ORIGIN: cloudfrontDomain
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256
    });

    // Grant Lambda function read access to DynamoDB table
    table.grantReadData(fn);

    return fn;
  }

  private createApiGatewayLoggingRole(): iam.Role {
    // Create IAM role for API Gateway CloudWatch logging
    return new iam.Role(this, 'ApiGatewayLoggingRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs'
        )
      ]
    });
  }

  private createApiGateway(
    userPool: cognito.UserPool,
    fn: lambda.Function,
    loggingRole: iam.Role,
    cloudfrontDomain: string
  ): apigateway.RestApi {
    // Create account settings for API Gateway logging
    new apigateway.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: loggingRole.roleArn
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'JobMatchingApi', {
      restApiName: `job-matching-api-${this.stage}`,
      description: 'API for job matching data',
      defaultCorsPreflightOptions: {
        allowOrigins: [cloudfrontDomain],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1)
      },
      deployOptions: {
        stageName: this.stage,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true
      }
    });

    // Create Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'JobMatchingAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // Create API resources and methods
    const matchingResource = api.root.addResource('match');

    // GET /match - Get job matching data (requires auth)
    matchingResource.addMethod('GET', new apigateway.LambdaIntegration(fn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO
    });

    return api;
  }

  private addOutputs(stage: string): void {
    addStackOutputs(this, stage, [
      {
        id: 'JobMatchingApiUrl',
        value: this.api.url,
        description: 'URL of the Job Matching API',
        exportName: `job-matching-api-url-${stage}`,
        paramName: 'NEXT_PUBLIC_JOB_MATCHING_API_URL'
      }
    ]);
  }
}
