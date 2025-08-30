// Import modules under test
import ADMIN_CONFIG from '../../admin/lib/config.mjs';

describe('Admin Configuration', () => {

  describe('Basic structure', () => {
    test('should load admin config structure', () => {
      expect(ADMIN_CONFIG).toBeDefined();
      expect(ADMIN_CONFIG.regions).toBeDefined();
      expect(ADMIN_CONFIG.tables).toBeDefined();
      expect(ADMIN_CONFIG.paths).toBeDefined();
    });

    test('should have all required data types', () => {
      const requiredTypes = ['developer', 'projects', 'recruiters'];
      requiredTypes.forEach(type => {
        expect(ADMIN_CONFIG.tables[type]).toBeDefined();
      });
    });
  });

  describe('Validation configuration', () => {
    test('should have schema files configured', () => {
      Object.values(ADMIN_CONFIG.tables).forEach(dataType => {
        expect(dataType.file).toBeDefined();
        expect(typeof dataType.file).toBe('string');
      });
    });

    test('should have path templates configured', () => {
      expect(ADMIN_CONFIG.paths.ssmTemplate).toContain('{stage}');
      expect(ADMIN_CONFIG.paths.ssmTemplate).toContain('{paramName}');
    });

    test('should have SSM parameters configured', () => {
      Object.values(ADMIN_CONFIG.tables).forEach(dataType => {
        expect(dataType.ssmParam).toBeDefined();
        expect(typeof dataType.ssmParam).toBe('string');
      });
    });
  });
});