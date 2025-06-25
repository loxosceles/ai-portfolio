import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

export interface JobMatchingResolverProps {
  api: appsync.GraphqlApi;
  jobMatchingTable: dynamodb.ITable;
  stage: string;
}

export class JobMatchingResolverConstruct extends Construct {
  public readonly dataSource: appsync.LambdaDataSource;

  constructor(scope: Construct, id: string, props: JobMatchingResolverProps) {
    super(scope, id);

    // Create Lambda function
    const jobMatchingFunction = new lambda.Function(this, 'Function', {
      functionName: `job-matching-resolver-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'job-matching-resolver')),
      environment: {
        MATCHING_TABLE_NAME: props.jobMatchingTable.tableName
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256
    });

    // Grant DynamoDB read access
    props.jobMatchingTable.grantReadData(jobMatchingFunction);

    // Create data source
    this.dataSource = props.api.addLambdaDataSource('JobMatchingDataSource', jobMatchingFunction);

    // Create resolvers
    this.dataSource.createResolver('GetJobMatchingResolver', {
      typeName: 'Query',
      fieldName: 'getJobMatching'
    });

    // Add resolver for direct linkId access (API key auth)
    this.dataSource.createResolver('GetJobMatchingByLinkIdResolver', {
      typeName: 'Query',
      fieldName: 'getJobMatchingByLinkId',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "operation": "Invoke",
          "payload": {
            "arguments": $util.toJson($ctx.arguments),
            "identity": $util.toJson($ctx.identity)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `)
    });
  }
}
