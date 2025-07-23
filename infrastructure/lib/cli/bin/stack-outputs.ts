#!/usr/bin/env node
import { Command } from 'commander';
import { handleGetStackOutput } from '../commands/stack-outputs';

const program = new Command();

program
  .description('Get CloudFormation stack output value')
  .argument('<stackType>', 'Stack type (web, api, shared)')
  .argument('<outputKey>', 'Output key to retrieve')
  .action(async (stackType: string, outputKey: string) => {
    try {
      const value = await handleGetStackOutput(stackType, outputKey);
      // Output only the value without any formatting for easy capture in scripts
      process.stdout.write(value);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
