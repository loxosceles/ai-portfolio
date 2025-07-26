import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { addStackOutputs } from './stack-helpers';
import { ISharedStackEnv } from '../../types';

interface ISharedStackProps extends cdk.StackProps {
  stackEnv: ISharedStackEnv;
}

export class SharedStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  private readonly userPoolDomain: cognito.UserPoolDomain;
  private readonly stackEnv: ISharedStackEnv;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: ISharedStackProps) {
    super(scope, id, props);
    this.stackEnv = props.stackEnv;
    this.stage = this.stackEnv.stage;

    this.userPool = this.createUserPool();
    this.userPoolClient = this.createUserPoolClient();
    this.userPoolDomain = this.createUserPoolDomain();

    const cognitoAuthority = `https://${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    addStackOutputs(this, this.stage, [
      {
        id: 'CognitoUserPoolId',
        value: this.userPool.userPoolId,
        description: 'Cognito User Pool ID',
        exportName: 'cognito-user-pool-id',
        paramName: 'COGNITO_USER_POOL_ID'
      },
      {
        id: 'CognitoClientId',
        value: this.userPoolClient.userPoolClientId,
        description: 'Cognito User Pool Client ID',
        exportName: 'cognito-client-id',
        paramName: 'COGNITO_CLIENT_ID'
      },
      {
        id: 'CognitoDomainName',
        value: this.userPoolDomain.domainName,
        description: 'Cognito Domain Name',
        exportName: 'cognito-domain-name',
        paramName: 'COGNITO_DOMAIN_NAME'
      },
      {
        id: 'CognitoAuthority',
        value: cognitoAuthority,
        description: 'Cognito Authority URL',
        exportName: 'cognito-authority',
        paramName: 'COGNITO_AUTHORITY'
      },
      // TODO: AWS Admin ARN will be used for a bucket policy when creating the data bucket
      {
        id: 'AWSAdminArn',
        value: this.stackEnv.awsAdminArn,
        description: 'AWS Admin ARN',
        exportName: 'aws-admin-arn',
        paramName: 'AWS_ADMIN_ARN'
      }
    ]);
  }

  private createUserPool(): cognito.IUserPool {
    const isProd = this.stage === 'prod';

    if (isProd) {
      // Reference existing production user pool
      return cognito.UserPool.fromUserPoolId(
        this,
        'SharedUserPool',
        `shared-user-pool-${this.stage}`
      );
    } else {
      // Create new user pool for dev
      return new cognito.UserPool(this, 'SharedUserPool', {
        userPoolName: `shared-user-pool-${this.stage}`,
        selfSignUpEnabled: false,
        signInAliases: {
          email: true,
          username: false
        },
        standardAttributes: {
          email: {
            required: true,
            mutable: true
          }
        },
        passwordPolicy: {
          minLength: 12,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: false
        },
        accountRecovery: cognito.AccountRecovery.NONE,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });
    }
  }

  private createUserPoolClient(): cognito.UserPoolClient {
    return this.userPool.addClient('SharedServiceClient', {
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        custom: false
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30)
    });
  }

  private createUserPoolDomain(): cognito.UserPoolDomain {
    const domainPrefix = this.generateDomainPrefix();
    return this.userPool.addDomain('PortfolioDomain', {
      cognitoDomain: {
        domainPrefix
      }
    });
  }

  private generateDomainPrefix(): string {
    return `${this.stackName}-${cdk.Names.uniqueId(this)}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}
