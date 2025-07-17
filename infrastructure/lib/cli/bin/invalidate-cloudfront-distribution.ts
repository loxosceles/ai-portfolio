#!/usr/bin/env node
import { Command } from 'commander';
// import * as process from 'process';
import { handleInvalidateCloudFrontDistribution } from '../commands/invalidate-cloudfront-distribution';

const program = new Command();

interface IInvalidateCloudFrontDistributionCommandOptions {
  verbose?: boolean;
}

program
  .description('Invalidate CloudFront distribution cache')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: IInvalidateCloudFrontDistributionCommandOptions) => {
    try {
      await handleInvalidateCloudFrontDistribution(options.verbose);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
