import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { addStackOutputs } from './stack-helpers';
import * as path from 'path';
import { IWebStackEnv } from '../../types';

interface IWebStackProps extends cdk.StackProps {
  stackEnv: IWebStackEnv;
}
/**
 * Combined stack for website hosting, content delivery, and visitor context
 * This eliminates cross-region references and circular dependencies
 */
export class WebStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  private readonly stage: string;
  private readonly stackEnv: IWebStackEnv;

  constructor(scope: Construct, id: string, props: IWebStackProps) {
    super(scope, id, props);
    this.stackEnv = props.stackEnv;
    this.stage = this.stackEnv.stage;

    const visitorTableName = `PortfolioVisitorLinks-${this.stage}`;

    // Get production-specific environment variables from stackEnv
    const prodDomainName = this.stackEnv.prodDomainName;
    const prodCertificateArn = this.stackEnv.certificateArn;

    const isProd = this.stage === 'prod';

    // Create DynamoDB table for visitor context
    this.createVisitorTable(isProd, visitorTableName);

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

    // Add permissions for SSM Parameter Store in both regions for this environment only
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          // Only allow access to this environment's parameters
          `arn:aws:ssm:${this.region}:${this.account}:parameter/portfolio/${this.stage}/*`,
          `arn:aws:ssm:eu-central-1:${this.account}:parameter/portfolio/${this.stage}/*`
        ]
      })
    );

    // Add permissions for Secrets Manager
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:/portfolio/${this.stage}/cognito/service-account-*`
        ]
      })
    );

    // Add permissions for Cognito (using region-specific pattern)
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminGetUser'],
        resources: [
          `arn:aws:cognito-idp:${process.env.AWS_DEFAULT_REGION}:${this.account}:userpool/*`
        ]
      })
    );

    // Add DynamoDB permissions
    edgeFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem'],
        resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${visitorTableName}`]
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

    // Create the Lambda@Edge function using environment-specific directory
    const visitorContextFunction = new cloudfront.experimental.EdgeFunction(
      this,
      'VisitorContextFunction',
      {
        functionName: `visitor-context-${this.stage}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, `../../lib/functions/visitor-context/${this.stage}`)
        ),
        role: edgeFunctionRole,
        stackId: `${this.stackName}-visitor-context-${this.stage}-edge`,
        timeout: cdk.Duration.seconds(5),
        memorySize: 128,
        description: `Adds visitor context headers for ${this.stage} environment`,
        logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
      }
    );

    // Create the S3 origin using the provided bucket and OAC
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
      originAccessLevels: [cloudfront.AccessLevel.READ, cloudfront.AccessLevel.LIST]
    });

    // Create security headers policy
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          override: true
        },
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' *.amazonaws.com *.execute-api.eu-central-1.amazonaws.com *.execute-api.us-east-1.amazonaws.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';",
          override: true
        }
      }
    });

    // Get domain name for production from environment variable
    let domainName: string | undefined;
    if (isProd) {
      domainName = prodDomainName;
    }

    // Use existing certificate for production
    let certificate: acm.ICertificate | undefined;
    let domainNames: string[] | undefined;

    if (isProd && domainName) {
      // Get certificate ARN from environment variable
      const certificateArn = prodCertificateArn;

      if (certificateArn) {
        // Use the existing certificate that has been manually validated
        certificate = acm.Certificate.fromCertificateArn(
          this,
          'ImportedCertificate',
          certificateArn
        );
        domainNames = [domainName];
      }
    }

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        responseHeadersPolicy: responseHeadersPolicy,
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
      ],
      ...(isProd && certificate && domainNames
        ? {
            certificate,
            domainNames
          }
        : {})
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
        id: 'CloudfrontDomain',
        value: this.distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name',
        exportName: 'cloudfront-domain',
        paramName: 'CLOUDFRONT_DOMAIN'
      },
      {
        id: 'CloudfrontDistributionId',
        value: this.distribution.distributionId,
        description: 'CloudFront Distribution ID for web stack',
        exportName: 'web-cloudfront-distribution-id',
        paramName: 'CLOUDFRONT_DISTRIBUTION_ID'
      },
      {
        id: 'AwsRegionDistrib',
        value: 'us-east-1',
        description: 'AWS region for distribution services',
        exportName: 'aws-region-distrib',
        paramName: 'AWS_REGION_DISTRIB'
      },
      {
        id: 'WebBucketName',
        value: this.websiteBucket.bucketName,
        description: 'S3 bucket name for website hosting',
        exportName: 'web-bucket-name',
        paramName: 'WEB_BUCKET_NAME'
      },
      {
        id: 'VisitorTableName',
        value: visitorTableName,
        description: 'DynamoDB table name for visitor context',
        exportName: 'visitor-table-name',
        paramName: 'VISITOR_TABLE_NAME'
      }
    ]);
  }

  private createVisitorTable(isProd: boolean, visitorTableName: string): dynamodb.ITable {
    if (isProd) {
      // Reference existing production table
      return dynamodb.Table.fromTableName(this, 'VisitorLinkTable', visitorTableName);
    } else {
      // Create new table for dev
      return new dynamodb.Table(this, 'VisitorLinkTable', {
        tableName: visitorTableName,
        partitionKey: { name: 'linkId', type: dynamodb.AttributeType.STRING },
        timeToLiveAttribute: 'ttl',
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryption: dynamodb.TableEncryption.AWS_MANAGED
      });
    }
  }
}
