import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Create AWS client mocks
const ddbMock = mockClient(DynamoDBDocumentClient);
const ssmMock = mockClient(SSMClient);

// Import after mocking
const { default: AWSOperations } = await import('../lib/aws-operations.mjs');
const { default: ADMIN_CONFIG } = await import('../lib/config.mjs');

describe('AWSOperations', () => {
  let awsOps;

  beforeEach(() => {
    ddbMock.reset();
    ssmMock.reset();
    
    // Mock all SSM parameters that getTableNames needs
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/DEVELOPER_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'dev-developers-table' } });
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/PROJECTS_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'dev-projects-table' } });
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/RECRUITER_PROFILES_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'dev-recruiters-table' } });
    
    awsOps = new AWSOperations(ADMIN_CONFIG);
  });

  test('should get table names from SSM parameters', async () => {
    const tableNames = await awsOps.getTableNames('dev');

    expect(tableNames.developer).toBe('dev-developers-table');
    expect(tableNames.projects).toBe('dev-projects-table');
    expect(tableNames.recruiters).toBe('dev-recruiters-table');
  });

  test('should get all items from DynamoDB table', async () => {
    // Mock DynamoDB scan response
    ddbMock.on(ScanCommand, { TableName: 'dev-developers-table' })
      .resolves({ 
        Items: [
          { id: 'dev1', name: 'John Doe' },
          { id: 'dev2', name: 'Jane Smith' }
        ]
      });

    const items = await awsOps.getAllItems('dev', 'developer');

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('dev1');
    expect(items[0].name).toBe('John Doe');
    expect(items[1].id).toBe('dev2');
    expect(items[1].name).toBe('Jane Smith');
    
    expect(ddbMock.commandCalls(ScanCommand)).toHaveLength(1);
    expect(ddbMock.commandCalls(ScanCommand)[0].args[0].input.TableName).toBe('dev-developers-table');
  });

  // Test for single item tables (like developer) - put the item
  test('should save single item to DynamoDB', async () => {
    // Mock the PutCommand to succeed
    ddbMock.on(PutCommand).resolves({});

    const developerData = { id: 'dev1', name: 'John Doe', email: 'john@example.com' };
    
    // Call saveItems with single item data
    await awsOps.saveItems('dev', 'developer', developerData);

    // Verify only one PutCommand was called with correct data
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.TableName).toBe('dev-developers-table');
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.Item).toEqual(developerData);
  });

  // Test for array item tables (projects and recruiters) - adds items to existing data
  test('should add items to DynamoDB for array tables', async () => {
    // Mock the PutCommand to succeed
    ddbMock.on(PutCommand).resolves({});

    // Test data for projects table
    const projectsData = [
      { id: 'proj1', name: 'Project 1' },
      { id: 'proj2', name: 'Project 2' }
    ];
    
    // Call saveItems with array data for projects
    await awsOps.saveItems('dev', 'projects', projectsData);

    // Verify correct number of PutCommands for projects
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(2);
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.TableName).toBe('dev-projects-table');
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.Item).toEqual(projectsData[0]);
    expect(ddbMock.commandCalls(PutCommand)[1].args[0].input.Item).toEqual(projectsData[1]);

    // Reset mock for recruiters test
    ddbMock.reset();
    ssmMock.reset();
    
    // Re-mock SSM parameters for recruiters test
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/RECRUITER_PROFILES_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'dev-recruiters-table' } });
    
    ddbMock.on(PutCommand).resolves({});

    // Test data for recruiters table
    const recruitersData = [
      { linkId: 'rec1', name: 'Recruiter 1' },
      { linkId: 'rec2', name: 'Recruiter 2' }
    ];
    
    // Call saveItems with array data for recruiters
    await awsOps.saveItems('dev', 'recruiters', recruitersData);

    // Verify correct number of PutCommands for recruiters
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(2);
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.TableName).toBe('dev-recruiters-table');
    expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.Item).toEqual(recruitersData[0]);
    expect(ddbMock.commandCalls(PutCommand)[1].args[0].input.Item).toEqual(recruitersData[1]);
  });

  test('should get individual SSM parameter', async () => {
    // Create fresh instance to avoid cached table names
    const freshAwsOps = new AWSOperations(ADMIN_CONFIG);
    
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/prod/DATA_BUCKET_NAME' })
      .resolves({ Parameter: { Value: 'prod-data-bucket' } });

    const paramValue = await freshAwsOps.getSSMParameter('prod', 'DATA_BUCKET_NAME');

    expect(paramValue).toBe('prod-data-bucket');
    
    // Verify the exact parameter path construction
    const calls = ssmMock.commandCalls(GetParameterCommand);
    const paramCall = calls.find(call => 
      call.args[0].input.Name === '/portfolio/prod/DATA_BUCKET_NAME'
    );
    expect(paramCall).toBeDefined();
  });
});
