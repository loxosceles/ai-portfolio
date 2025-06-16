import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { Construct } from 'constructs';

interface FrontendStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
}

export class FrontendStack extends cdk.Stack {
  private readonly stage: string;
  private readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);
    this.stage = props.stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    // Create S3 bucket for hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `portfolio-${this.stage}-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: this.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: this.stage === 'dev'
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket, {
      originAccessLevels: [cloudfront.AccessLevel.READ, cloudfront.AccessLevel.LIST]
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      enableLogging: true
    });

    // Grant CloudFront access to the bucket
    websiteBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:ListBucket'],
        principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
        resources: [websiteBucket.bucketArn, `${websiteBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`
          }
        }
      })
    );

    // Deploy website content
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../frontend/out'))],
      destinationBucket: websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*']
    });

    this.addStackOutputs();
  }

  private addStackOutputs() {
    const outputs = [
      {
        id: 'DistributionDomainName',
        value: this.distribution.distributionDomainName,
        description: 'CloudFront Distribution Domain Name',
        exportName: 'cloudfront-domain',
        paramName: 'CLOUDFRONT_DOMAIN'
      },
      {
        id: 'DistributionId',
        value: this.distribution.distributionId,
        description: 'CloudFront Distribution ID',
        exportName: 'cloudfront-distribution-id',
        paramName: 'CLOUDFRONT_DISTRIBUTION_ID'
      }
    ];

    outputs.forEach((output) => {
      // Stack outputs
      new cdk.CfnOutput(this, output.id, {
        value: output.value,
        description: output.description,
        exportName: output.exportName
      });

      // SSM Parameters
      new ssm.StringParameter(this, `${output.id}Param`, {
        parameterName: `/portfolio/${this.stage}/${output.paramName}`,
        stringValue: output.value,
        description: output.description
      });
    });
  }
}
