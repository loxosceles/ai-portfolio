import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { addStackOutputs } from '../utils/stack-outputs';

interface CombinedWebsiteStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
}

/**
 * Combined stack for website hosting, content delivery, and visitor context
 * This eliminates cross-region references and circular dependencies
 */
export class CombinedWebsiteStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: CombinedWebsiteStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.env?.account,
        region: 'us-east-1' // Everything must be in us-east-1 for Lambda@Edge
      }
    });
    this.stage = props.stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    const isProd = this.stage === 'prod';

    // Create S3 bucket for hosting
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `portfolio-combined-${this.stage}-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd
    });

    // Create DynamoDB table for visitor context
    const visitorTable = new dynamodb.Table(this, 'VisitorContextTable', {
      tableName: `PortfolioVisitorContext-${this.stage}`,
      partitionKey: { name: 'visitorHash', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd
    });

    // Create the S3 origin with OAC
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
      originAccessLevels: [cloudfront.AccessLevel.READ, cloudfront.AccessLevel.LIST]
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true
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

    // Add bucket policy for CloudFront OAC
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
        id: 'CombinedBucketName',
        value: this.websiteBucket.bucketName,
        description: 'Name of the combined website bucket',
        exportName: 'combined-website-bucket',
        paramName: 'COMBINED_WEBSITE_BUCKET_NAME'
      },
      {
        id: 'CombinedDistributionDomainName',
        value: this.distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name for combined stack',
        exportName: 'combined-cloudfront-domain',
        paramName: 'COMBINED_CLOUDFRONT_DOMAIN'
      },
      {
        id: 'CombinedDistributionId',
        value: this.distribution.distributionId,
        description: 'CloudFront Distribution ID for combined stack',
        exportName: 'combined-cloudfront-distribution-id',
        paramName: 'COMBINED_CLOUDFRONT_DISTRIBUTION_ID'
      },
      {
        id: 'VisitorContextTableName',
        value: visitorTable.tableName,
        description: 'Name of the visitor context DynamoDB table',
        exportName: 'visitor-context-table',
        paramName: 'VISITOR_CONTEXT_TABLE'
      }
    ]);
  }
}
