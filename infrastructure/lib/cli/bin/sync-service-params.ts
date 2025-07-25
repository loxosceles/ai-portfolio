#!/usr/bin/env node
import { Command } from 'commander';
import { handleSyncServiceParameters } from '../commands/sync-service-params';

interface ISyncServiceParametersCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  cleanup?: boolean;
}

const program = new Command();

program
  .description('Sync service parameters from CloudFormation stack outputs to SSM Parameter Store')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--cleanup', 'Delete obsolete service parameters')
  .action(async (options: ISyncServiceParametersCommandOptions) => {
    try {
      const result = await handleSyncServiceParameters({
        verbose: options.verbose ?? false,
        dryRun: options.dryRun ?? false,
        cleanup: options.cleanup ?? false
      });

      if (!result.success) {
        console.error(`Error: ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
