import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { addStackOutputs } from '../utils/stack-outputs';

interface SharedStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
}

export class SharedStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  private readonly userPoolClient: cognito.UserPoolClient;
  private readonly userPoolDomain: cognito.UserPoolDomain;
  private readonly stage: string;

  constructor(scope: Construct, id: string, props: SharedStackProps) {
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
        paramName: 'NEXT_PUBLIC_COGNITO_USER_POOL_ID'
      },
      {
        id: 'CognitoClientId',
        value: this.userPoolClient.userPoolClientId,
        description: 'Cognito User Pool Client ID',
        exportName: 'cognito-client-id',
        paramName: 'NEXT_PUBLIC_COGNITO_CLIENT_ID'
      },
      {
        id: 'CognitoDomainName',
        value: this.userPoolDomain.domainName,
        description: 'Cognito Domain Name',
        exportName: 'cognito-domain-name',
        paramName: 'NEXT_PUBLIC_COGNITO_DOMAIN_NAME'
      },
      {
        id: 'CognitoAuthority',
        value: cognitoAuthority,
        description: 'Cognito Authority URL',
        exportName: 'cognito-authority',
        paramName: 'NEXT_PUBLIC_COGNITO_AUTHORITY'
      },
      {
        id: 'RedirectUri',
        value: redirectUri,
        description: 'OAuth Redirect URI',
        exportName: 'redirect-uri',
        paramName: 'NEXT_PUBLIC_REDIRECT_URI'
      }
    ]);
  }

  private createUserPool(): cognito.UserPool {
    return new cognito.UserPool(this, 'PortfolioUserPool', {
      userPoolName: 'portfolio-user-pool',
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
      customAttributes: {
        // Example of custom attributes
        //   profilePicture: new cognito.StringAttribute({ mutable: true }),
        //   firstName: new cognito.StringAttribute({ mutable: true }),
        //   lastName: new cognito.StringAttribute({ mutable: true })
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true
      }
    });
  }

  private createUserPoolClient(): cognito.UserPoolClient {
    return this.userPool.addClient('PortfolioClient', {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.PHONE
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback'
          // 'https://your-production-domain/auth/callback'
        ],
        logoutUrls: [
          'http://localhost:3000/login'
          // 'https://your-production-domain/login'
        ]
      },
      preventUserExistenceErrors: true,
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
        custom: false,
        userSrp: true
      },
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
