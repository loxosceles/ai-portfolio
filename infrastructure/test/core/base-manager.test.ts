import { BaseManager } from '../../lib/core/base-manager';
import { BaseManagerConfig } from '../../types/config';

// Mock environment
process.env.ENVIRONMENT = 'dev';

// Create a concrete implementation of BaseManager for testing
class TestManager extends BaseManager {
  constructor(config: BaseManagerConfig) {
    super(config);
  }
}

describe('BaseManager', () => {
  // Test configuration
  const testConfig: BaseManagerConfig = {
    projectRoot: '/test/project/root',
    supportedStages: ['dev', 'prod']
  };

  // Create manager instance
  const manager = new TestManager(testConfig);

  describe('validateStage', () => {
    test('should validate supported stage', () => {
      expect(manager.validateStage('dev')).toBe(true);
      expect(manager.validateStage('prod')).toBe(true);
    });

    test('should throw error for unsupported stage', () => {
      expect(() => manager.validateStage('invalid')).toThrow(
        'Invalid stage: invalid. Must be one of: dev, prod'
      );
    });
  });
});
