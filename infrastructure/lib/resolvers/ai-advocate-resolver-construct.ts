import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface IAIAdvocateResolverProps {
  api: appsync.GraphqlApi;
  aiAdvocateLambda: lambda.Function;
}

export class AIAdvocateResolverConstruct extends Construct {
  public readonly dataSource: appsync.LambdaDataSource;

  constructor(scope: Construct, id: string, props: IAIAdvocateResolverProps) {
    super(scope, id);

    const { api, aiAdvocateLambda } = props;

    this.dataSource = api.addLambdaDataSource('AIAdvocateDataSource', aiAdvocateLambda);

    this.dataSource.createResolver('GetAdvocateGreetingResolver', {
      typeName: 'Query',
      fieldName: 'getAdvocateGreeting'
    });

    this.dataSource.createResolver('GetAdvocateGreetingByLinkIdResolver', {
      typeName: 'Query',
      fieldName: 'getAdvocateGreetingByLinkId'
    });

    this.dataSource.createResolver('AskAIQuestionResolver', {
      typeName: 'Query',
      fieldName: 'askAIQuestion'
    });

    this.dataSource.createResolver('ResetConversationResolver', {
      typeName: 'Mutation',
      fieldName: 'resetConversation'
    });
  }
}
