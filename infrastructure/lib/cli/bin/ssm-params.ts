import { Command } from 'commander';
import { handleUploadParameters, handleExportParameters } from '../commands/ssm-params';
import { IUploadOptions, IExportOptions } from '../../../types/cli/ssm-params';

interface IUploadCommandOptions {
  region?: string;
  dryRun?: boolean;
  verbose?: boolean;
  target?: string;
  skipCleanup?: boolean;
}

interface IExportCommandOptions {
  regions?: string;
  scope?: string;
  format?: 'env' | 'json';
  target?: string;
  output?: boolean;
  outputPath?: string;
  verbose?: boolean;
}

const program = new Command();

program
  .name('ssm-params')
  .description('Manage SSM parameters for the portfolio application')
  .version('1.0.0');

program
  .command('upload')
  .description('Upload parameters from environment files to SSM Parameter Store')
  .requiredOption(
    '--target <target>',
    'Target for parameters (infrastructure|frontend|link-generator)'
  )
  .option('-r, --region <region>', 'Upload to specific region only (eu-central-1|us-east-1)')
  .option('-d, --dry-run', 'Show what would be uploaded without actually uploading')
  .option('--skip-cleanup', 'Skip cleanup of existing parameters before upload')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: IUploadCommandOptions) => {
    try {
      const result = await handleUploadParameters({
        region: options.region,
        dryRun: options.dryRun,
        verbose: options.verbose,
        target: options.target,
        skipCleanup: options.skipCleanup
      } as IUploadOptions);

      // eslint-disable-next-line no-console
      console.log('\n=== Upload Summary ===');
      // eslint-disable-next-line no-console
      console.log(`Stage: ${process.env.ENVIRONMENT}`);

      if (options.dryRun) {
        // eslint-disable-next-line no-console
        console.log('Mode: DRY RUN (no actual uploads performed)');
      } else {
        // eslint-disable-next-line no-console
        console.log(`Status: ${result.message}`);
      }

      // eslint-disable-next-line no-console
      console.log(`Parameters available at: /portfolio/${process.env.ENVIRONMENT}/stack/`);

      process.exit(result.errorCount > 0 ? 1 : 0);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('export')
  .description('Export parameters from SSM Parameter Store')
  .requiredOption(
    '--target <target>',
    'Target for parameters (infrastructure|frontend|link-generator)'
  )
  .option('-r, --regions <regions>', 'Comma-separated list of regions to download from')
  .option('-s, --scope <scope>', 'Parameter scope (e.g., stack)')
  .option('-f, --format <format>', 'Output format (env|json)', 'env')
  .option('-o, --output', 'Write to file instead of console output')
  .option('--output-path <path>', 'Custom output file path')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: IExportCommandOptions) => {
    try {
      const result = await handleExportParameters({
        regions: options.regions ? options.regions.split(',') : undefined,
        scope: options.scope,
        format: options.format as 'env' | 'json',
        target: options.target,
        output: options.output,
        outputPath: options.outputPath,
        verbose: options.verbose
      } as IExportOptions);

      if (!result.success) {
        console.error(result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
