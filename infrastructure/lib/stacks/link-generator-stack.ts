import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { addStackOutputs } from './stack-helpers';
import { ILinkGeneratorStackEnv } from '../../types';

interface TableConfig {
  name: string;
  constructId: string;
}

interface ILinkGeneratorStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool;
  userPoolClient: cognito.UserPoolClient;
  stackEnv: ILinkGeneratorStackEnv;
  tableNames: {
    visitorLinks: TableConfig;
    recruiterProfiles: TableConfig;
  };
}

export class LinkGeneratorStack extends cdk.Stack {
  public readonly linkGeneratorLambda: lambda.Function;
  private readonly stage: string;
  private readonly stackEnv: ILinkGeneratorStackEnv;
  private readonly tableConfigs: { visitorLinks: TableConfig; recruiterProfiles: TableConfig };

  constructor(scope: Construct, id: string, props: ILinkGeneratorStackProps) {
    super(scope, id, props);
    const { userPool, userPoolClient, stackEnv, tableNames } = props;
    this.stackEnv = stackEnv;
    this.stage = this.stackEnv.stage;
    this.tableConfigs = tableNames;

    // Reference VisitorLinks table (created by WebStack in us-east-1)
    const visitorLinksTable = dynamodb.Table.fromTableName(
      this,
      this.tableConfigs.visitorLinks.constructId,
      this.tableConfigs.visitorLinks.name
    );

    // Reference RecruiterProfiles table (created by AIAdvocateStack)
    const recruiterProfilesTable = dynamodb.Table.fromTableName(
      this,
      this.tableConfigs.recruiterProfiles.constructId,
      this.tableConfigs.recruiterProfiles.name
    );

    // Create Lambda function with proper environment variables
    this.linkGeneratorLambda = this.createLinkGeneratorLambda(
      userPool,
      userPoolClient,
      visitorLinksTable,
      recruiterProfilesTable
    );

    // Grant IAM permissions
    this.grantPermissions(userPool);

    // Add stack outputs following existing pattern
    addStackOutputs(this, this.stage, [
      {
        id: 'LinkGeneratorLambdaArn',
        value: this.linkGeneratorLambda.functionArn,
        description: 'Link Generator Lambda Function ARN',
        exportName: `link-generator-lambda-arn-${this.stage}`,
        paramName: 'LINK_GENERATOR_LAMBDA_ARN'
      }
    ]);
  }

  private createLinkGeneratorLambda(
    userPool: cognito.IUserPool,
    userPoolClient: cognito.UserPoolClient,
    visitorLinksTable: dynamodb.ITable,
    recruiterProfilesTable: dynamodb.ITable
  ): lambda.Function {
    return new NodejsFunction(this, 'LinkGeneratorFunction', {
      functionName: `link-generator-${this.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../functions/link-generator/index.mjs'),
      handler: 'handler',
      bundling: {
        externalModules: ['@aws-sdk/*'],
        minify: true,
        sourceMap: true
      },
      environment: {
        ENVIRONMENT: this.stage,
        VISITOR_TABLE_NAME: visitorLinksTable.tableName,
        RECRUITER_PROFILES_TABLE_NAME: recruiterProfilesTable.tableName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        AWS_REGION_DISTRIB: this.stackEnv.awsRegionDistrib,
        AWS_REGION_DEFAULT: this.stackEnv.awsRegionDefault
        // NOTE: CLOUDFRONT_DOMAIN is NOT included as environment variable
        // This would create a circular dependency: LinkGeneratorStack -> WebStack -> LinkGeneratorStack
        // Instead, the Lambda retrieves it from SSM at runtime: /portfolio/{stage}/CLOUDFRONT_DOMAIN
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512
    });
  }

  private grantPermissions(userPool: cognito.IUserPool): void {
    // Grant DynamoDB permissions with explicit IAM policies
    this.linkGeneratorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan'
        ],
        resources: [
          `arn:aws:dynamodb:${this.stackEnv.awsRegionDistrib}:${this.account}:table/${this.tableConfigs.visitorLinks.name}`,
          `arn:aws:dynamodb:${this.stackEnv.awsRegionDefault}:${this.account}:table/${this.tableConfigs.recruiterProfiles.name}`
        ]
      })
    );

    // Grant Cognito permissions
    this.linkGeneratorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminInitiateAuth'
        ],
        resources: [userPool.userPoolArn]
      })
    );

    // Grant SSM permissions to read CloudFront domain parameter
    this.linkGeneratorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${this.stackEnv.awsRegionDistrib}:${this.account}:parameter/portfolio/${this.stage}/CLOUDFRONT_DOMAIN`
        ]
      })
    );
  }
}
