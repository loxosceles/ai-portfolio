// test/admin/data-validation.test.mjs

import { validateData, clearValidatorCache } from '../../admin/lib/validation.mjs';

describe('Schema-Based Data Validation', () => {
  beforeEach(() => {
    clearValidatorCache();
  });

  test('should validate developer data successfully', async () => {
    const validDeveloperData = {
      id: 'dev1',
      name: 'John Doe',
      title: 'Full Stack Developer',
      bio: 'Passionate about building scalable web applications',
      email: 'john@example.com',
      website: 'https://john-doe.com',
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      telegram: 'https://t.me/johndoe',
      location: 'Berlin, Germany',
      yearsOfExperience: 8,
      isActive: true,
      skillSets: [
        {
          id: 'frontend',
          name: 'Frontend',
          skills: ['React', 'TypeScript', 'Next.js']
        },
        {
          id: 'backend', 
          name: 'Backend',
          skills: ['Node.js', 'Express', 'AWS Lambda']
        }
      ]
    };

    const result = await validateData('developer', validDeveloperData, 'dev');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate developer data with validation errors', async () => {
    const invalidDeveloperData = {
      id: 123, // Should be string
      name: 'John Doe',
      title: 'Full Stack Developer',
      bio: 'Passionate developer',
      email: 'invalid-email', // Invalid email format
      website: 'not-a-url', // Invalid URL format
      skillSets: [] // Should have at least 1 item
    };

    const result = await validateData('developer', invalidDeveloperData, 'dev');
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Check for specific error types
    const emailError = result.errors.find(err => err.field === '/email');
    const websiteError = result.errors.find(err => err.field === '/website');
    const skillSetsError = result.errors.find(err => err.field === '/skillSets');
    
    if (emailError) expect(emailError.message).toContain('format');
    if (websiteError) expect(websiteError.message).toContain('format');
    if (skillSetsError) expect(skillSetsError.message).toContain('fewer than');
  });

  test('should handle schema loading errors', async () => {
    // Use invalid stage to trigger schema loading error
    const result = await validateData('developer', { id: 'test' }, 'nonexistent-stage');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('schema');
    expect(result.errors[0].message).toContain('Failed to load schema for developer');
  });

  test('should cache validators and reuse them', async () => {
    // First call
    const result1 = await validateData('developer', {
      id: 'dev1',
      name: 'John Doe',
      title: 'Developer',
      bio: 'Test bio',
      email: 'test@example.com',
      skillSets: [{ id: 'test', name: 'Test', skills: ['test'] }]
    }, 'dev');
    expect(result1.valid).toBe(true);

    // Second call - should use cache
    const result2 = await validateData('developer', {
      id: 'dev2',
      name: 'Jane Doe',
      title: 'Developer',
      bio: 'Test bio',
      email: 'test2@example.com',
      skillSets: [{ id: 'test', name: 'Test', skills: ['test'] }]
    }, 'dev');
    expect(result2.valid).toBe(true);
  });

  test('should handle unknown data type', async () => {
    const result = await validateData('nonexistent', { id: 'test' }, 'dev');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('schema');
    expect(result.errors[0].message).toContain('No schema file configured for data type: nonexistent');
  });
});