import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { DynamoDBResolverConstruct } from './dynamodb-resolver-construct';

export interface IAPIResolverProps {
  api: appsync.GraphqlApi;
  developerDataSource: appsync.DynamoDbDataSource;
  projectsDataSource: appsync.DynamoDbDataSource;
}

export class APIResolverConstruct extends Construct {
  constructor(scope: Construct, id: string, props: IAPIResolverProps) {
    super(scope, id);

    const { developerDataSource, projectsDataSource } = props;

    // Custom resolver for getDeveloper with fixed key
    developerDataSource.createResolver('GetDeveloperResolver', {
      typeName: 'Query',
      fieldName: 'getDeveloper',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "operation": "GetItem",
          "key": {
            "id": $util.dynamodb.toDynamoDBJson("DEVELOPER_PROFILE")
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    // Developer mutation resolver
    new DynamoDBResolverConstruct(this, 'UpdateDeveloper', {
      dataSource: developerDataSource,
      typeName: 'Mutation',
      fieldName: 'updateDeveloper',
      operation: 'update'
    });

    // Project query resolvers (Public - API key)
    new DynamoDBResolverConstruct(this, 'GetProject', {
      dataSource: projectsDataSource,
      typeName: 'Query',
      fieldName: 'getProject',
      operation: 'get'
    });

    new DynamoDBResolverConstruct(this, 'ListProjects', {
      dataSource: projectsDataSource,
      typeName: 'Query',
      fieldName: 'listProjects',
      operation: 'list'
    });

    // Relationship resolvers
    projectsDataSource.createResolver('DeveloperProjectsResolver', {
      typeName: 'Developer',
      fieldName: 'projects',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
    {
      "version": "2018-05-29",
      "operation": "Query",
      "query": {
        "expression": "developerId = :developerId",
        "expressionValues": {
          ":developerId": $util.dynamodb.toDynamoDBJson($ctx.source.id)
        }
      },
      "index": "byDeveloperId"
    }
  `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList()
    });

    developerDataSource.createResolver('ProjectDeveloperResolver', {
      typeName: 'Project',
      fieldName: 'developer',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem('id', 'developerId'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });
  }
}
