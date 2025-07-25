import { AWSManager } from '../../core/aws-manager';
import {
  awsManagerConfig,
  STACK_TYPES,
  STACK_PREFIXES,
  STACK_REGIONS
} from '../../../configs/aws-config';

interface ISyncServiceParametersOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

interface ISyncServiceParametersResult {
  success: boolean;
  message: string;
  syncedCount: number;
  deletedCount: number;
}

const awsManager = new AWSManager(awsManagerConfig);

export async function handleSyncServiceParameters(
  options: ISyncServiceParametersOptions
): Promise<ISyncServiceParametersResult> {
  try {
    const { verbose = false, dryRun = false } = options;
    const stage = awsManager.getStage();
    const regions = awsManager.getRegionsForStage();

    let totalSynced = 0;
    let totalDeleted = 0;

    for (const region of regions) {
      if (verbose) {
        // eslint-disable-next-line no-console
        console.log(`Processing region: ${region}`);
      }

      // Build stack-region mapping from constants
      const stackRegionMapping: Record<string, string> = {};
      for (const stackType of STACK_TYPES) {
        const stackName = `${STACK_PREFIXES[stackType]}-${stage}`;
        const stackRegion = STACK_REGIONS[stackType];
        stackRegionMapping[stackName] = stackRegion;
      }

      // Only process stacks that belong to this region
      const stacksForRegion = Object.entries(stackRegionMapping)
        .filter(([, stackRegion]) => stackRegion === region)
        .map(([stackName]) => stackName);

      // Sync parameters from stack outputs
      const stackOutputs: Array<{ OutputKey: string; OutputValue: string }> = [];

      for (const stackName of stacksForRegion) {
        if (verbose) {
          // eslint-disable-next-line no-console
          console.log(`Getting outputs from stack: ${stackName}`);
        }

        const outputs = await awsManager.getStackOutputs(stackName, region);
        stackOutputs.push(...outputs);

        if (verbose) {
          // eslint-disable-next-line no-console
          console.log(`Found ${outputs.length} outputs from ${stackName}`);
        }
      }

      // Sync stack outputs to SSM parameters
      for (const output of stackOutputs) {
        const paramPath = `/portfolio/${stage}/${output.OutputKey}`;

        if (dryRun) {
          if (verbose) {
            // eslint-disable-next-line no-console
            console.log(`[DRY-RUN] Would sync: ${paramPath} = ${output.OutputValue}`);
          }
        } else {
          await awsManager.putParameter(paramPath, output.OutputValue, region);
          totalSynced++;

          if (verbose) {
            // eslint-disable-next-line no-console
            console.log(`Synced: ${paramPath} = ${output.OutputValue}`);
          }
        }
      }
    }

    const action = dryRun ? 'Would sync' : 'Synced';
    let message = `✅ ${action} ${totalSynced} service parameters`;

    return {
      success: true,
      message,
      syncedCount: totalSynced,
      deletedCount: totalDeleted
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to sync service parameters: ${error instanceof Error ? error.message : String(error)}`,
      syncedCount: 0,
      deletedCount: 0
    };
  }
}
