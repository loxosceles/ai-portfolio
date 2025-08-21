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

interface ILinkGeneratorStackProps extends cdk.StackProps {
  stackEnv: ILinkGeneratorStackEnv;
}

export class LinkGeneratorStack extends cdk.Stack {
  public readonly linkGeneratorLambda: lambda.Function;
  private readonly stage: string;
  private readonly stackEnv: ILinkGeneratorStackEnv;

  constructor(scope: Construct, id: string, props: ILinkGeneratorStackProps) {
    super(scope, id, props);
    this.stackEnv = props.stackEnv;
    this.stage = this.stackEnv.stage;

    // Create basic Lambda function (no logic yet, just structure)
    this.linkGeneratorLambda = this.createLinkGeneratorLambda();

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

  private createLinkGeneratorLambda(): lambda.Function {
    return new lambda.Function(this, 'LinkGeneratorFunction', {
      functionName: `link-generator-${this.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/link-generator')),
      environment: {
        ENVIRONMENT: this.stage
        // Other environment variables will be added in Phase 2
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512
    });
  }
}
