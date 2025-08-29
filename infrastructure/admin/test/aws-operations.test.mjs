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

  describe('CRUD Operations', () => {
    // Business Logic Tests - Primary Focus
    describe('Business Rules', () => {
      test('should prevent creating items in developer table', async () => {
        await expect(awsOps.createItem('dev', 'developer', { id: 'dev1' }))
          .rejects.toThrow('Cannot create new items in developer table. Use updateItem instead.');
      });

      test('should prevent deleting from developer table', async () => {
        await expect(awsOps.deleteItem('dev', 'developer', {}))
          .rejects.toThrow('Cannot delete from developer table.');
      });

      test('should require existing developer profile for updates', async () => {
        ddbMock.on(ScanCommand).resolves({ Items: [] }); // No existing profile
        
        await expect(awsOps.updateItem('dev', 'developer', { id: 'dev1' }))
          .rejects.toThrow('No developer profile exists. Create one through data import first.');
      });

      test('should allow developer update when profile exists', async () => {
        ddbMock.on(ScanCommand).resolves({ Items: [{ id: 'existing' }] });
        ddbMock.on(PutCommand).resolves({});
        
        await expect(awsOps.updateItem('dev', 'developer', { id: 'dev1' }))
          .resolves.not.toThrow();
      });
    });

    // Contract Tests - Verify AWS SDK Usage
    describe('AWS SDK Integration', () => {
      test('should call PutCommand with correct parameters for createItem', async () => {
        ddbMock.on(PutCommand).resolves({}); // Realistic success response
        
        const projectData = { id: 'proj1', name: 'Test Project' };
        await awsOps.createItem('dev', 'projects', projectData);
        
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
        expect(ddbMock.commandCalls(PutCommand)[0].args[0].input).toEqual({
          TableName: 'dev-projects-table',
          Item: projectData
        });
      });

      test('should call DeleteCommand with correct parameters', async () => {
        ddbMock.on(DeleteCommand).resolves({}); // Realistic success response
        
        await awsOps.deleteItem('dev', 'projects', { id: 'proj1' });
        
        expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1);
        expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input).toEqual({
          TableName: 'dev-projects-table',
          Key: { id: 'proj1' }
        });
      });

      test('should call PutCommand for updateItem on multi-entity tables', async () => {
        ddbMock.on(PutCommand).resolves({});
        
        const recruiterData = { linkId: 'rec1', name: 'Updated Recruiter' };
        await awsOps.updateItem('dev', 'recruiters', recruiterData);
        
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
        expect(ddbMock.commandCalls(PutCommand)[0].args[0].input).toEqual({
          TableName: 'dev-recruiters-table',
          Item: recruiterData
        });
      });
    });

    // Helper Function Tests
    describe('Helper Functions', () => {
      test('should generate correct keys for different table types', () => {
        expect(awsOps.getItemKey('recruiters', { linkId: 'rec1' }))
          .toEqual({ linkId: 'rec1' });
        
        expect(awsOps.getItemKey('projects', { id: 'proj1' }))
          .toEqual({ id: 'proj1' });
        
        expect(() => awsOps.getItemKey('unknown', {}))
          .toThrow('Cannot generate key for table: unknown');
      });
    });
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
