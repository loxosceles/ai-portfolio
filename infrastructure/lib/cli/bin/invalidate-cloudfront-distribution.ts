#!/usr/bin/env node
import { Command } from 'commander';
// import * as process from 'process';
import { invalidateCloudFrontDistribution } from '../commands/invalidate-cloudfront-distribution';

const program = new Command();

program
  .description('Invalidate CloudFront distribution cache')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: any) => {
    try {
      await invalidateCloudFrontDistribution(options.verbose);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
