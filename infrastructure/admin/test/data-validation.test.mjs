import { jest } from '@jest/globals';

// Mock fs/promises before importing validation
const mockReadFile = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
  readFile: mockReadFile
}));

// Import after mocking
const { validateData, clearValidatorCache } = await import('../lib/validation.mjs');

describe('Schema-Based Data Validation', () => {
  beforeEach(() => {
    clearValidatorCache();
    mockReadFile.mockClear();
  });

  describe('Valid data validation', () => {
    test('should validate developer data successfully', async () => {
      // Mock schema for developer
      const developerSchema = {
        type: 'object',
        required: ['id', 'name', 'email'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        }
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(developerSchema));

      const validDeveloperData = {
        id: 'dev1',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const result = await validateData('developer', validDeveloperData, 'dev');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('developer-schema.json'),
        'utf-8'
      );
    });

    test('should validate developer data with validation errors', async () => {
      // Mock schema for developer
      const developerSchema = {
        type: 'object',
        required: ['id', 'name', 'email'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        }
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(developerSchema));

      const invalidDeveloperData = {
        id: 123, // Should be string
        name: 'John Doe',
        email: 'invalid-email' // Invalid email format
      };

      const result = await validateData('developer', invalidDeveloperData, 'dev');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      
      // Check specific error messages
      const idError = result.errors.find(err => err.field === '/id');
      const emailError = result.errors.find(err => err.field === '/email');
      
      expect(idError.message).toBe('must be string');
      expect(emailError.message).toBe('must match format "email"');
    });
  });

  describe('Error handling', () => {
    test('should handle schema loading errors', async () => {
      // Mock readFile to reject with realistic filesystem error
      const fileError = new Error("ENOENT: no such file or directory, open '/path/to/developer-schema.json'");
      fileError.code = 'ENOENT';
      fileError.errno = -2;
      fileError.syscall = 'open';
      fileError.path = '/path/to/developer-schema.json';
      
      mockReadFile.mockRejectedValueOnce(fileError);

      const result = await validateData('developer', { id: 'test' }, 'dev');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('schema');
      expect(result.errors[0].message).toContain('Failed to load schema for developer');
      expect(result.errors[0].message).toContain('ENOENT');
      expect(result.errors[0].value).toBe(null);
    });

    test('should handle invalid JSON schema', async () => {
      // Mock readFile to return invalid JSON
      mockReadFile.mockResolvedValueOnce('{ invalid json syntax');

      const result = await validateData('developer', { id: 'test' }, 'dev');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('schema');
      expect(result.errors[0].message).toContain('Failed to load schema for developer');
      expect(result.errors[0].message).toContain('Expected property name');
      expect(result.errors[0].value).toBe(null);
    });

    test('should cache validators and reuse them', async () => {
      const developerSchema = {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } }
      };

      mockReadFile.mockResolvedValue(JSON.stringify(developerSchema));

      // First call - should load schema
      await validateData('developer', { id: 'dev1' }, 'dev');
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Second call - should use cache, not call readFile again
      await validateData('developer', { id: 'dev2' }, 'dev');
      expect(mockReadFile).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Different stage - should load schema again
      await validateData('developer', { id: 'dev3' }, 'prod');
      expect(mockReadFile).toHaveBeenCalledTimes(2); // Now 2

      // Same stage again - should use cache
      await validateData('developer', { id: 'dev4' }, 'prod');
      expect(mockReadFile).toHaveBeenCalledTimes(2); // Still 2
    });

    test('should handle unknown data type', async () => {
      const result = await validateData('nonexistent', { id: 'test' }, 'dev');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('schema');
      expect(result.errors[0].message).toContain('No schema file configured for data type: nonexistent');
      expect(result.errors[0].value).toBe(null);
      
      // readFile should not be called since config lookup fails first
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });
});