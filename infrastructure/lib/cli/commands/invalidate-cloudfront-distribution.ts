import { AWSManager } from '../../core/aws-manager';
import { awsManagerConfig } from '../../../configs/aws-config';

/**
 * Invalidate CloudFront Distribution Command
 *
 * Orchestrates:
 * 1. Get current distribution ID from stack output
 * 2. Invalidate the distribution
 */
export async function invalidateCloudFrontDistribution(verbose: boolean = false): Promise<void> {
  const awsManager = new AWSManager(awsManagerConfig);

  try {
    const region = awsManager.getRegionForService('cloudfront');
    const stackName = awsManager.getStackNameForService('web');
    const outputKey = 'CloudFrontDistributionId';

    awsManager.logVerbose(
      verbose,
      `Getting distribution ID from stack ${stackName} in ${region}...`
    );
    const distributionId = await awsManager.getStackOutput(stackName, outputKey, region);

    awsManager.logVerbose(verbose, `Invalidating CloudFront distribution ${distributionId}...`);
    await awsManager.invalidateDistribution(distributionId, region);

    console.log('✅ CloudFront invalidation completed');
  } catch (error) {
    console.error(`❌ Failed to invalidate CloudFront distribution: ${error}`);
    throw error;
  }
}
