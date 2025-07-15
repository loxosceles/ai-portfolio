#!/usr/bin/env node
import { Command } from 'commander';
import { publishWebApp } from '../commands/web-app-publish';

const program = new Command();

program
  .description('Build and publish web application')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: any) => {
    try {
      await publishWebApp(options.verbose);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
