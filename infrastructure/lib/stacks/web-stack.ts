import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { addStackOutputs } from '../utils/stack-outputs';
import * as path from 'path';

interface WebStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

/**
 * Combined stack for website hosting, content delivery, and visitor context
 * This eliminates cross-region references and circular dependencies
 */
export class WebStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.env?.account,
        region: 'us-east-1' // Everything must be in us-east-1 for Lambda@Edge
      }
    });
    this.stage = props.stage;
    this.userPool = props.userPool;
    this.userPoolClient = props.userPoolClient;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    const isProd = this.stage === 'prod';

    // Create DynamoDB table for visitor context
    const visitorTable = new dynamodb.Table(this, 'VisitorLinkTable', {
      tableName: `portfolio-visitor-links-${this.stage}`,
      partitionKey: { name: 'linkId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl', // Add TTL for link expiration
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    // // Create S3 bucket for hosting
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `portfolio-web-${this.stage}-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd
    });

    new cloudfront.CfnOriginAccessControl(this, 'BucketOAC', {
      originAccessControlConfig: {
        name: `${this.stackName}-oac`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    const edgeFunctionRole = new iam.Role(this, 'VisitorContextFunctionRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('edgelambda.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Add permissions for SSM Parameter Store in both regions
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/portfolio/${props.stage}/*`,
          `arn:aws:ssm:eu-central-1:${this.account}:parameter/portfolio/${props.stage}/*`
        ]
      })
    );

    // Add permissions for Secrets Manager
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:/portfolio/${props.stage}/cognito/service-account-*`
        ]
      })
    );

    // Add permissions for Cognito
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminGetUser'],
        resources: [props.userPool.userPoolArn]
      })
    );

    // Add DynamoDB permissions
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem'],
        resources: [visitorTable.tableArn]
      })
    );

    // Add explicit permissions to create log groups in all regions (required for Edge Functions)
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['arn:aws:logs:*:*:*']
      })
    );

    // Create the Lambda@Edge function
    const visitorContextFunction = new cloudfront.experimental.EdgeFunction(
      this,
      'VisitorContextFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../lib/functions/visitor-context')),
        role: edgeFunctionRole,
        stackId: `${this.stackName}-visitor-context-edge`,
        timeout: cdk.Duration.seconds(5),
        memorySize: 128,
        description: 'Adds visitor context headers based on query parameters',
        logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
      }
    );

    // Create the S3 origin using the provided bucket and OAC
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
      originAccessLevels: [cloudfront.AccessLevel.READ, cloudfront.AccessLevel.LIST],
      customHeaders: {
        'X-Portfolio-Stage': this.stage
      }
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        edgeLambdas: [
          {
            functionVersion: visitorContextFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
            includeBody: false
          },
          {
            functionVersion: visitorContextFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_RESPONSE,
            includeBody: false
          }
        ]
      },
      defaultRootObject: 'index.html',
      enableLogging: true,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ]
    });

    // Add bucket policy for CloudFront access
    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [this.websiteBucket.arnForObjects('*'), this.websiteBucket.bucketArn],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`
          }
        }
      })
    );

    // Add stack outputs with unique export names
    addStackOutputs(this, this.stage, [
      {
        id: 'WebBucketName',
        value: this.websiteBucket.bucketName,
        description: 'Name of the website bucket',
        exportName: 'web-bucket',
        paramName: 'WEB_BUCKET_NAME'
      },
      {
        id: 'WebDistributionDomainName',
        value: this.distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name for web stack',
        exportName: 'web-cloudfront-domain',
        paramName: 'WEB_CLOUDFRONT_DOMAIN'
      },
      {
        id: 'WebDistributionId',
        value: this.distribution.distributionId,
        description: 'CloudFront Distribution ID for web stack',
        exportName: 'web-cloudfront-distribution-id',
        paramName: 'WEB_CLOUDFRONT_DISTRIBUTION_ID'
      },
      {
        id: 'EdgeFunctionRegion',
        value: 'eu-central-1',
        description: 'Region for Edge Function to access Cognito',
        exportName: 'edge-function-region',
        paramName: 'edge/function-region'
      },
      {
        id: 'EdgeVisitorTableName',
        value: visitorTable.tableName,
        description: 'DynamoDB table for visitor links',
        exportName: 'edge-visitor-table',
        paramName: 'edge/visitor-table-name'
      },
      {
        id: 'EdgeVisitorTableRegion',
        value: 'us-east-1',
        description: 'Region for visitor table',
        exportName: 'edge-visitor-table-region',
        paramName: 'edge/visitor-table-region'
      }
    ]);
  }
}
