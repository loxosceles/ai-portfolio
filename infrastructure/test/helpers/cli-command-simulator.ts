import * as ssmCommands from '../../lib/cli/commands/ssm-params';
import * as dataCommands from '../../lib/cli/commands/data-management';
import * as invalidateCommands from '../../lib/cli/commands/invalidate-cloudfront-distribution';
import * as publishCommands from '../../lib/cli/commands/web-app-publish';
import { IExportOptions, IExportResult } from '../../types/cli/ssm-params';
import { IDataManagementOptions, IDataManagementResult } from '../../types/cli/data-management';

// Define upload result type to match the function return
interface IUploadResult {
  success: boolean;
  message: string;
  errorCount: number;
}

// Export wrapped command handlers that can be easily mocked
export const ssmCommandHandlers = {
  upload: ssmCommands.handleUploadParameters,
  export: ssmCommands.handleExportParameters
};

export const dataCommandHandlers = {
  upload: dataCommands.handleUploadData,
  download: dataCommands.handleDownloadData,
  populateDynamoDB: dataCommands.handlePopulateDynamoDB
};

export const invalidateCommandHandlers = {
  invalidate: invalidateCommands.invalidateCloudFrontDistribution
};

export const publishCommandHandlers = {
  publish: publishCommands.publishWebApp
};

// Environment is set in test/setup/environment.js

// Function to simulate SSM CLI execution without spawning a process
export async function simulateSSMCLI(
  command: string,
  options: Record<string, any> = {}
): Promise<IUploadResult | IExportResult> {
  if (command === 'upload') {
    return await ssmCommandHandlers.upload(options);
  } else if (command === 'export') {
    return await ssmCommandHandlers.export(options as IExportOptions);
  }
  throw new Error(`Unknown command: ${command}`);
}

// Function to simulate Data Management CLI execution without spawning a process
export async function simulateDataCLI(
  command: string,
  options: IDataManagementOptions = {}
): Promise<IDataManagementResult> {
  if (command === 'upload') {
    return await dataCommandHandlers.upload(options);
  } else if (command === 'download') {
    return await dataCommandHandlers.download(options);
  } else if (command === 'populate_ddb_with_static_data') {
    return await dataCommandHandlers.populateDynamoDB(options);
  }
  throw new Error(`Unknown command: ${command}`);
}

// Function to simulate CloudFront invalidation CLI execution
export async function simulateInvalidateCLI(verbose: boolean = false): Promise<void> {
  return await invalidateCommandHandlers.invalidate(verbose);
}

// Function to simulate Web App Publish CLI execution
export async function simulatePublishCLI(verbose: boolean = false): Promise<void> {
  return await publishCommandHandlers.publish(verbose);
}
