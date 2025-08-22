describe('Data Validation', () => {
  describe('Developer validation', () => {
    test('should require id field', () => {
      const invalidDeveloper = { name: 'Test Dev' };

      const isValid = validateDeveloper(invalidDeveloper);

      expect(isValid).toBe(false);
    });

    test('should accept valid developer', () => {
      const validDeveloper = {
        id: 'dev-1',
        name: 'Test Dev',
        title: 'Developer',
        email: 'test@example.com'
      };

      const isValid = validateDeveloper(validDeveloper);

      expect(isValid).toBe(true);
    });
  });

  describe('Projects validation', () => {
    test('should require id for all projects', () => {
      const invalidProjects = [
        { id: 'proj-1', title: 'Valid Project' },
        { title: 'Invalid Project' }
      ];

      const isValid = validateProjects(invalidProjects);

      expect(isValid).toBe(false);
    });

    test('should accept valid projects array', () => {
      const validProjects = [
        { id: 'proj-1', title: 'Project 1' },
        { id: 'proj-2', title: 'Project 2' }
      ];

      const isValid = validateProjects(validProjects);

      expect(isValid).toBe(true);
    });
  });

  describe('Recruiters validation', () => {
    test('should require linkId for all recruiters', () => {
      const invalidRecruiters = [
        { linkId: 'rec-1', recruiterName: 'Valid Recruiter' },
        { recruiterName: 'Invalid Recruiter' }
      ];

      const isValid = validateRecruiters(invalidRecruiters);

      expect(isValid).toBe(false);
    });

    test('should accept valid recruiters array', () => {
      const validRecruiters = [
        { linkId: 'rec-1', recruiterName: 'Recruiter 1' },
        { linkId: 'rec-2', recruiterName: 'Recruiter 2' }
      ];

      const isValid = validateRecruiters(validRecruiters);

      expect(isValid).toBe(true);
    });
  });
});

function validateDeveloper(data: unknown): boolean {
  const dev = data as Record<string, unknown>;
  return !!(dev.id && dev.id !== '');
}

function validateProjects(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return data.every((item) => {
    const proj = item as Record<string, unknown>;
    return proj.id && proj.id !== '';
  });
}

function validateRecruiters(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return (data as unknown[]).every((item) => {
    const rec = item as Record<string, unknown>;
    return rec.linkId && rec.linkId !== '';
  });
}
