import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { IPipelineStackEnv } from '../../types';

interface IPipelineStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  stackEnv: IPipelineStackEnv;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IPipelineStackProps) {
    super(scope, id, props);

    const { githubOwner, githubRepo, githubBranch, stackEnv } = props;
    const stage = stackEnv.stage;

    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      bucketName: `portfolio-pipeline-artifacts-${stage}-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CodeBuild service role with necessary permissions
    const buildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess')],
      inlinePolicies: {
        AdditionalPermissions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'iam:CreateRole',
                'iam:DeleteRole',
                'iam:AttachRolePolicy',
                'iam:DetachRolePolicy',
                'iam:PutRolePolicy',
                'iam:DeleteRolePolicy',
                'iam:GetRole',
                'iam:PassRole',
                'iam:TagRole',
                'iam:UntagRole',
                'iam:ListRolePolicies',
                'iam:ListAttachedRolePolicies'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:HeadObject',
                's3:ListBucket',
                's3:CreateBucket',
                's3:PutBucketVersioning'
              ],
              resources: [
                'arn:aws:s3:::portfolio-development-data',
                'arn:aws:s3:::portfolio-development-data/*',
                'arn:aws:s3:::portfolio-production-data',
                'arn:aws:s3:::portfolio-production-data/*'
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: [
                `arn:aws:ssm:us-east-1:${this.account}:parameter/portfolio/prod/PROD_DOMAIN_NAME`
              ]
            })
          ]
        })
      }
    });

    // CodeBuild project
    const buildProject = new codebuild.Project(this, 'BuildProject', {
      projectName: `portfolio-build-${stage}`,
      role: buildRole,
      source: codebuild.Source.gitHub({
        owner: githubOwner,
        repo: githubRepo,
        webhook: false
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environmentVariables: {
        ENVIRONMENT: {
          value: stage
        },
        AWS_DEFAULT_REGION: {
          value: this.region
        },
        AWS_ACCOUNT_ID: {
          value: this.account
        }
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER)
    });

    // Pipeline artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // GitHub source action
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch,
      oauthToken: cdk.SecretValue.secretsManager('github-token-ai-portfolio'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.NONE
    });

    // Build action
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_Deploy',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput]
    });

    // Create the pipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `portfolio-pipeline-${stage}`,
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction]
        },
        {
          stageName: 'Build',
          actions: [buildAction]
        }
      ]
    });

    // Outputs
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'Name of the CodePipeline'
    });

    new cdk.CfnOutput(this, 'PipelineUrl', {
      value: `https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipelineName}/view`,
      description: 'URL to view the pipeline in AWS Console'
    });
  }
}
