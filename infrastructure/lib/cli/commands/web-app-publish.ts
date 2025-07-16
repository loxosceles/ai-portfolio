import * as path from 'path';
import { AWSManager } from '../../core/aws-manager';
import { awsManagerConfig } from '../../../configs/aws-config';

/**
 * Web App Publish Command
 *
 * AWS operations only - Next.js build handled by shell script
 */
export async function handlePublishWepApp(verbose: boolean = false): Promise<void> {
  const awsManager = new AWSManager(awsManagerConfig);
  const stage = awsManager.getStage();
  const region = awsManager.getRegionForService('web');
  const stackName = awsManager.getStackNameForService('web');

  awsManager.logVerbose(verbose, `Publishing web app for ${stage} stage...`);

  // 1. Get bucket name (AWSManager - AWS operation)
  awsManager.logVerbose(verbose, `Getting bucket name from stack ${stackName}...`);
  const bucketName = await awsManager.getStackOutput(stackName, 'WebBucketName', region);

  // 2. Sync to S3 (AWSManager - AWS operation)
  awsManager.logVerbose(verbose, `Syncing to S3 bucket ${bucketName}...`);
  const frontendOutDir = path.join(awsManager.config.projectRoot, '../frontend/out');
  await awsManager.syncDirectoryToS3(frontendOutDir, bucketName, region);

  // eslint-disable-next-line no-console
  console.log('✅ Web app publishing completed');
}
