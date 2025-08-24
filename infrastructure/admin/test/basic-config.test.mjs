describe('Admin Configuration', () => {
  let ADMIN_CONFIG;

  beforeAll(async () => {
    // Import the actual config
    const configModule = await import('../lib/config.mjs');
    ADMIN_CONFIG = configModule.default;
  });

  describe('Basic structure', () => {
    test('should load admin config structure', () => {
      expect(ADMIN_CONFIG).toBeDefined();
      expect(ADMIN_CONFIG.regions).toBeDefined();
      expect(ADMIN_CONFIG.dataTypes).toBeDefined();
      expect(ADMIN_CONFIG.paths).toBeDefined();
    });

    test('should have all required data types', () => {
      const requiredTypes = ['developer', 'projects', 'recruiters'];
      requiredTypes.forEach(type => {
        expect(ADMIN_CONFIG.dataTypes[type]).toBeDefined();
      });
    });
  });

  describe('Validation configuration', () => {
    test('should have schema files configured', () => {
      Object.values(ADMIN_CONFIG.dataTypes).forEach(dataType => {
        expect(dataType.file).toBeDefined();
        expect(typeof dataType.file).toBe('string');
      });
    });

    test('should have path templates configured', () => {
      expect(ADMIN_CONFIG.paths.ssmTemplate).toContain('{stage}');
      expect(ADMIN_CONFIG.paths.ssmTemplate).toContain('{paramName}');
    });

    test('should have SSM parameters configured', () => {
      Object.values(ADMIN_CONFIG.dataTypes).forEach(dataType => {
        expect(dataType.ssmParam).toBeDefined();
        expect(typeof dataType.ssmParam).toBe('string');
      });
    });
  });
});