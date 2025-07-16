/**
 * Web App Publish CLI Tests
 */
import { simulatePublishCLI, publishCommandHandlers } from '../helpers/cli-command-simulator';

// Mock Web App Publish command handlers
jest.mock('../../lib/cli/commands/web-app-publish', () => ({
  publishWebApp: jest.fn().mockResolvedValue(undefined)
}));

describe('Web App Publish CLI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute publish command successfully', async () => {
    await simulatePublishCLI();
    expect(publishCommandHandlers.publish).toHaveBeenCalled();
  });

  test('should handle verbose option', async () => {
    await simulatePublishCLI(true);
    expect(publishCommandHandlers.publish).toHaveBeenCalledWith(true);
  });
});
