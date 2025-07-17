import { AWSManager } from '../../core/aws-manager';
import { awsManagerConfig } from '../../../configs/aws-config';

type StackType = 'web' | 'api' | 'shared';

/**
 * Stack Outputs Command
 *
 * Retrieves a specific output value from a CloudFormation stack
 */
export async function handleGetStackOutput(stackType: string, outputKey: string): Promise<string> {
  const awsManager = new AWSManager(awsManagerConfig);

  try {
    // Validate stack type
    if (!['web', 'api', 'shared'].includes(stackType)) {
      throw new Error(`Invalid stack type: ${stackType}. Must be one of: web, api, shared`);
    }

    const validStackType = stackType as StackType;
    const region = awsManager.getRegionForService(validStackType === 'web' ? 'cloudfront' : 'api');
    const stackName = awsManager.getStackNameForService(validStackType);

    return await awsManager.getStackOutput(stackName, outputKey, region);
  } catch (error) {
    throw new Error(`Failed to get stack output: ${error}`);
  }
}
