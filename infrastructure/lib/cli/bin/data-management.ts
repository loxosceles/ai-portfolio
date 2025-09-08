#!/usr/bin/env node
import { Command } from 'commander';
import {
  handleUploadData,
  handleDownloadData,
  handlePopulateDynamoDB
} from '../commands/data-management';
interface IUploadDataCommandOptions {
  verbose?: boolean;
  output?: string;
  region?: string;
}

interface IDownloadDataCommandOptions {
  verbose?: boolean;
  output?: string;
  region?: string;
  useDownloadedSchemas?: boolean;
}

interface IPopulateDynamoDBWithStaticDataCommandOptions {
  verbose?: boolean;
  region?: string;
  useDownloadedSchemas?: boolean;
}

// Create a new command instance
const program = new Command();

program
  .name('data-management')
  .description('Manage static data for the portfolio application')
  .version('1.0.0');

program
  .command('upload')
  .description('Upload static data to S3')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-r, --region <region>', 'AWS region to use')
  .action(async (options: IUploadDataCommandOptions) => {
    try {
      const result = await handleUploadData({
        verbose: options.verbose ?? false,
        region: options.region
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

program
  .command('download')
  .description('Download static data from S3')
  .option('-o, --output <directory>', 'Output directory for downloaded data')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-r, --region <region>', 'AWS region to use')
  .option('--use-downloaded-schemas', 'Use schemas downloaded from S3 instead of local files')
  .action(async (options: IDownloadDataCommandOptions) => {
    try {
      const result = await handleDownloadData({
        verbose: options.verbose ?? false,
        output: options.output,
        region: options.region,
        useDownloadedSchemas: options.useDownloadedSchemas ?? false
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

program
  .command('populate_ddb_with_static_data')
  .description('Download static data from S3 and populate DynamoDB tables')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-r, --region <region>', 'AWS region to use')
  .option('--use-downloaded-schemas', 'Use schemas downloaded from S3 instead of local files')
  .action(async (options: IPopulateDynamoDBWithStaticDataCommandOptions) => {
    try {
      const result = await handlePopulateDynamoDB({
        verbose: options.verbose ?? false,
        region: options.region,
        useDownloadedSchemas: options.useDownloadedSchemas ?? false
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
