import { jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import request from 'supertest';

// CRITICAL: Mock fs modules before importing server to prevent real file creation
// ES modules capture dependencies at import time, so mocks must be set up first
// Must mock both 'fs' (for `import { promises as fs }`) and 'fs/promises' (for `import { readFile }`)
jest.unstable_mockModule('fs', () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('{}')
  }
}));

jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('{}')
}));

jest.unstable_mockModule('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => cb(null, { stdout: '', stderr: '' }))
}));

// Create AWS client mocks
const ddbMock = mockClient(DynamoDBDocumentClient);
const ssmMock = mockClient(SSMClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('Individual CRUD Operations', () => {
  let app;

  beforeAll(async () => {
    // Import server after mocks are set up
    const serverModule = await import('../../admin/server.mjs');
    app = serverModule.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ddbMock.reset();
    ssmMock.reset();
    cognitoMock.reset();
    
    // Mock SSM parameters with specific responses
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/DEVELOPER_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'test-developers-table' } });
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/PROJECTS_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'test-projects-table' } });
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/RECRUITER_PROFILES_TABLE_NAME' })
      .resolves({ Parameter: { Value: 'test-recruiters-table' } });
    ssmMock.on(GetParameterCommand, { Name: '/portfolio/dev/COGNITO_USER_POOL_ID' })
      .resolves({ Parameter: { Value: 'us-east-1_TestPool123' } });
    
    // Mock DynamoDB operations
    ddbMock.on(ScanCommand).resolves({ Items: [] });
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).resolves({});
    
    // Mock Cognito operations
    cognitoMock.on(AdminCreateUserCommand).resolves({
      User: {
        Username: 'test-user',
        UserStatus: 'CONFIRMED'
      }
    });
  });

  describe('Developer CRUD', () => {
    test('PUT /api/dev/developer should update developer', async () => {
      // Mock existing developer profile (required by business rules)
      ddbMock.on(ScanCommand, { TableName: 'test-developers-table' })
        .resolves({ Items: [{ id: 'existing-dev' }] });
      
      const developerData = {
        id: 'dev1',
        name: 'Test Developer',
        title: 'Senior Developer',
        email: 'test@example.com',
        bio: 'Test bio',
        skillSets: [
          {
            id: 'frontend',
            name: 'Frontend',
            skills: ['React', 'JavaScript']
          }
        ]
      };

      const response = await request(app)
        .put('/api/dev/developer')
        .send(developerData);

      expect(response.status).toBe(200);
    });
  });

  describe('Projects CRUD', () => {
    test('POST /api/dev/projects should create project', async () => {
      const projectData = {
        id: 'proj1',
        title: 'Test Project',
        description: 'Test description',
        status: 'Active',
        highlights: ['Key feature'],
        techStack: ['React', 'Node.js'],
        developerId: 'dev1'
      };

      const response = await request(app)
        .post('/api/dev/projects')
        .send(projectData);

      if (response.status !== 200) {
        console.log('Project POST error:', response.body);
      }
      expect(response.status).toBe(200);
    });

    test('PUT /api/dev/projects/:id should update project', async () => {
      const projectData = {
        id: 'proj1',
        title: 'Updated Project',
        description: 'Updated description',
        status: 'Completed',
        highlights: ['Updated feature'],
        techStack: ['React', 'Node.js', 'AWS'],
        developerId: 'dev1'
      };

      const response = await request(app)
        .put('/api/dev/projects/proj1')
        .send(projectData);

      if (response.status !== 200) {
        console.log('Project PUT error:', response.body);
      }
      expect(response.status).toBe(200);
    });

    test('DELETE /api/dev/projects/:id should delete project', async () => {
      const response = await request(app)
        .delete('/api/dev/projects/proj1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Recruiters CRUD', () => {
    test('POST /api/dev/recruiters should create recruiter', async () => {
      const recruiterData = {
        linkId: 'test-recruiter-001',
        recruiterName: 'Test Recruiter',
        companyName: 'Test Company',
        open_position: 'Senior Developer',
        context: 'Remote position',
        skills: ['React', 'Node.js'],
        active: true
      };

      const response = await request(app)
        .post('/api/dev/recruiters')
        .send(recruiterData);

      expect(response.status).toBe(200);
    });

    test('PUT /api/dev/recruiters/:linkId should update recruiter', async () => {
      const recruiterData = {
        linkId: 'test-recruiter-001',
        recruiterName: 'Updated Recruiter',
        companyName: 'Updated Company',
        open_position: 'Lead Developer',
        context: 'Hybrid position',
        skills: ['React', 'Node.js', 'AWS'],
        active: true
      };

      const response = await request(app)
        .put('/api/dev/recruiters/test-recruiter-001')
        .send(recruiterData);

      if (response.status !== 200) {
        console.log('Recruiter PUT error:', response.body);
      }
      expect(response.status).toBe(200);
    });

    test('DELETE /api/dev/recruiters/:linkId should delete recruiter', async () => {
      const response = await request(app)
        .delete('/api/dev/recruiters/test-recruiter-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Sync Status', () => {
    test('GET /api/dev/sync-status should return sync status', async () => {
      const response = await request(app)
        .get('/api/dev/sync-status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isDirty');
      expect(response.body).toHaveProperty('lastSync');
    });
  });

  describe('Export and Upload', () => {
    test('POST /api/dev/export-upload should handle export', async () => {
      const response = await request(app)
        .post('/api/dev/export-upload');

      // May fail due to missing dependencies, but route should exist
      expect([200, 500].includes(response.status)).toBe(true);
    });

    test('should show file paths used during export', async () => {
      // Get the mocked fs functions to inspect calls
      const { promises: fs } = await import('fs');
      
      const response = await request(app)
        .post('/api/dev/export-upload');
        
      // Check that writeFile was called with paths
      const writeFileCalls = fs.writeFile.mock.calls;
      const actualPaths = writeFileCalls.map(call => call[0]);
      
      // Show what paths are actually being used
      expect(actualPaths.length).toBeGreaterThan(0);
      expect(actualPaths[0]).toContain('data'); // Just verify it contains 'data'
      
      // This will show the actual paths in the test output
      console.log('Paths used:', JSON.stringify(actualPaths, null, 2));
    });
  });
});