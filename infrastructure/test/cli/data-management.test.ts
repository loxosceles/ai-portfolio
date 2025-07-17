/**
 * Data Management CLI Tests
 */
import { simulateDataCLI, dataCommandHandlers } from '../helpers/cli-command-simulator';

// Mock Data Management command handlers
jest.mock('../../lib/cli/commands/data-management', () => ({
  handleUploadData: jest.fn().mockResolvedValue({
    success: true,
    message: '✅ Data upload completed successfully'
  }),
  handleDownloadData: jest.fn().mockResolvedValue({
    success: true,
    message: '✅ Data download completed successfully',
    data: { developers: [], projects: [] }
  }),
  handlePopulateDynamoDB: jest.fn().mockResolvedValue({
    success: true,
    message: '✅ DynamoDB tables populated successfully'
  })
}));

describe('Data Management CLI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upload command', () => {
    test('should execute upload command successfully', async () => {
      const result = await simulateDataCLI('upload');

      expect(dataCommandHandlers.upload).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Data upload completed successfully');
    });

    test('should handle verbose option', async () => {
      await simulateDataCLI('upload', { verbose: true });

      expect(dataCommandHandlers.upload).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
    });

    test('should handle region option', async () => {
      await simulateDataCLI('upload', { region: 'us-east-1' });

      expect(dataCommandHandlers.upload).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1' })
      );
    });
  });

  describe('download command', () => {
    test('should execute download command successfully', async () => {
      const result = await simulateDataCLI('download');

      expect(dataCommandHandlers.download).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Data download completed successfully');
    });

    test('should handle output option', async () => {
      await simulateDataCLI('download', { output: './data' });

      expect(dataCommandHandlers.download).toHaveBeenCalledWith(
        expect.objectContaining({ output: './data' })
      );
    });

    test('should handle region option', async () => {
      await simulateDataCLI('download', { region: 'us-east-1' });

      expect(dataCommandHandlers.download).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1' })
      );
    });
  });

  describe('populate_ddb_with_static_data command', () => {
    test('should execute populate_ddb_with_static_data command successfully', async () => {
      const result = await simulateDataCLI('populate_ddb_with_static_data');

      expect(dataCommandHandlers.populateDynamoDB).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('DynamoDB tables populated successfully');
    });

    test('should handle verbose option', async () => {
      await simulateDataCLI('populate_ddb_with_static_data', { verbose: true });

      expect(dataCommandHandlers.populateDynamoDB).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
    });
  });

  test('should throw error for invalid command', async () => {
    await expect(simulateDataCLI('invalid_command')).rejects.toThrow('Unknown command');
  });
});
