import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';

export type DynamoDBOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

export interface DynamoDBResolverProps {
  dataSource: appsync.DynamoDbDataSource;
  typeName: string;
  fieldName: string;
  operation: DynamoDBOperation;
  partitionKey?: string;
  sortKey?: string;
}

export class DynamoDBResolverConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DynamoDBResolverProps) {
    super(scope, id);

    const resolverConfig = this.getResolverConfig(props);

    props.dataSource.createResolver(`${props.typeName}${props.fieldName}Resolver`, {
      typeName: props.typeName,
      fieldName: props.fieldName,
      requestMappingTemplate: resolverConfig.request,
      responseMappingTemplate: resolverConfig.response
    });
  }

  private getResolverConfig(props: DynamoDBResolverProps) {
    const pk = props.partitionKey || 'id';

    switch (props.operation) {
      case 'get':
        return {
          request: appsync.MappingTemplate.dynamoDbGetItem(pk, pk),
          response: appsync.MappingTemplate.dynamoDbResultItem()
        };

      case 'list':
        return {
          request: appsync.MappingTemplate.dynamoDbScanTable(),
          response: appsync.MappingTemplate.dynamoDbResultList()
        };

      case 'create':
        return {
          request: appsync.MappingTemplate.dynamoDbPutItem(
            appsync.PrimaryKey.partition(pk).auto(),
            appsync.Values.projecting('input')
          ),
          response: appsync.MappingTemplate.dynamoDbResultItem()
        };

      case 'update':
        return {
          request: appsync.MappingTemplate.dynamoDbPutItem(
            appsync.PrimaryKey.partition(pk).is(`input.${pk}`),
            appsync.Values.projecting('input')
          ),
          response: appsync.MappingTemplate.dynamoDbResultItem()
        };

      case 'delete':
        return {
          request: appsync.MappingTemplate.dynamoDbDeleteItem(pk, pk),
          response: appsync.MappingTemplate.dynamoDbResultItem()
        };

      default:
        throw new Error(`Unsupported operation: ${props.operation}`);
    }
  }
}
