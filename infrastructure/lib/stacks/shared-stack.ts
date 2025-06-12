import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class SharedStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  private readonly userPoolClient: cognito.UserPoolClient;
  private readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = this.createUserPool();
    this.userPoolClient = this.createUserPoolClient();
    this.userPoolDomain = this.createUserPoolDomain();
    this.addCognitoOutputs();
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
    return `${this.stackName}-${cdk.Names.uniqueId(this)}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
  }
  private addCognitoOutputs() {
    // Infrastructure outputs
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'cognito-user-pool-id'
    });

    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'cognito-client-id'
    });

    new cdk.CfnOutput(this, 'CognitoDomainName', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito Domain Name',
      exportName: 'cognito-domain-name'
    });

    // Frontend environment variables
    new cdk.CfnOutput(this, 'NextPublicCognitoUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for frontend',
      exportName: 'next-public-cognito-user-pool-id'
    });

    new cdk.CfnOutput(this, 'NextPublicCognitoClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito Client ID for frontend',
      exportName: 'next-public-cognito-client-id'
    });

    new cdk.CfnOutput(this, 'NextPublicCognitoAuthority', {
      value: `https://${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Authority URL for frontend',
      exportName: 'next-public-cognito-authority'
    });

    new cdk.CfnOutput(this, 'NextPublicRedirectUri', {
      value:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000/auth/callback'
          : 'https://your-production-domain/auth/callback',
      description: 'OAuth Redirect URI',
      exportName: 'next-public-redirect-uri'
    });
  }
}
