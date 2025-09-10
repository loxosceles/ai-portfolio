import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';

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

    // Relationship resolver with efficient server-side sorting
    projectsDataSource.createResolver('DeveloperProjectsResolver', {
      typeName: 'Developer',
      fieldName: 'projects',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
    #set($sortOrder = true) # Default to ASC
    #if($ctx.args.sortOrder && $ctx.args.sortOrder == "DESC")
      #set($sortOrder = false)
    #end

    {
      "version": "2018-05-29",
      "operation": "Query",
      "query": {
        "expression": "developerId = :developerId",
        "expressionValues": {
          ":developerId": $util.dynamodb.toDynamoDBJson($ctx.source.id)
        }
      },
      "index": "byDeveloperId",
      "scanIndexForward": $sortOrder
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
