import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { addStackOutputs } from './stack-helpers';

interface ISharedStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
}

export class SharedStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  private readonly userPoolDomain: cognito.UserPoolDomain;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: ISharedStackProps) {
    super(scope, id, props);
    this.stage = props.stage;

    if (!['dev', 'prod'].includes(this.stage)) {
      throw new Error('Stage must be either "dev" or "prod"');
    }

    this.userPool = this.createUserPool();
    this.userPoolClient = this.createUserPoolClient();
    this.userPoolDomain = this.createUserPoolDomain();

    const cognitoAuthority = `https://${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;
    const redirectUri =
      process.env.ENVIRONMENT === 'development'
        ? 'http://localhost:3000/auth/callback'
        : 'https://your-production-domain/auth/callback';

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
      {
        id: 'RedirectUri',
        value: redirectUri,
        description: 'OAuth Redirect URI',
        exportName: 'redirect-uri',
        paramName: 'REDIRECT_URI'
      },
      {
        id: 'AWSAccountId',
        value: this.account,
        description: 'AWS Account ID',
        exportName: 'aws-account-id',
        paramName: 'AWS_ACCOUNT_ID'
      },
      {
        id: 'AWSAdminArn',
        value: process.env.AWS_ADMIN_ARN || `arn:aws:iam::${this.account}:user/loxosceles`,
        description: 'AWS Admin ARN',
        exportName: 'aws-admin-arn',
        paramName: 'AWS_ADMIN_ARN'
      }
    ]);
  }

  private createUserPool(): cognito.UserPool {
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
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
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
