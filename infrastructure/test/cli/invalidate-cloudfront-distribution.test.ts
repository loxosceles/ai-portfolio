/**
 * CloudFront Invalidation CLI Tests
 */
import { simulateInvalidateCLI, invalidateCommandHandlers } from '../helpers/cli-command-simulator';

// Mock CloudFront Invalidation command handlers
jest.mock('../../lib/cli/commands/invalidate-cloudfront-distribution', () => ({
  invalidateCloudFrontDistribution: jest.fn().mockResolvedValue(undefined)
}));

describe('CloudFront Invalidation CLI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute invalidation command successfully', async () => {
    await simulateInvalidateCLI();
    expect(invalidateCommandHandlers.invalidate).toHaveBeenCalled();
  });

  test('should handle verbose option', async () => {
    await simulateInvalidateCLI(true);
    expect(invalidateCommandHandlers.invalidate).toHaveBeenCalledWith(true);
  });
});
