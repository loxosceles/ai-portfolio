import { AWSManager } from '../../core/aws-manager';
import {
  awsManagerConfig,
  STACK_TYPES,
  STACK_PREFIXES,
  STACK_REGIONS
} from '../../../configs/aws-config';
import { SERVICE_CONFIGS } from '../../../configs/env-config';
import { pascalToScreamingSnake } from '../../../utils/generic';

interface ISyncServiceParametersOptions {
  verbose?: boolean;
  dryRun?: boolean;
  cleanup?: boolean;
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
    const { verbose = false, dryRun = false, cleanup = false } = options;
    const stage = awsManager.getStage();
    const regions = awsManager.getRegionsForStage();

    let totalSynced = 0;
    let totalDeleted = 0;

    // Build stack-region mapping from constants
    const stackRegionMapping: Record<string, string> = {};
    for (const stackType of STACK_TYPES) {
      const stackName = `${STACK_PREFIXES[stackType]}-${stage}`;
      const stackRegion = STACK_REGIONS[stackType];
      stackRegionMapping[stackName] = stackRegion;
    }

    // Collect all stack outputs from all regions first
    const allStackOutputs: Array<{ OutputKey: string; OutputValue: string; Region: string }> = [];

    for (const region of regions) {
      awsManager.logVerbose(verbose, `Processing region: ${region}`);

      // Only process stacks that belong to this region
      const stacksForRegion = Object.entries(stackRegionMapping)
        .filter(([, stackRegion]) => stackRegion === region)
        .map(([stackName]) => stackName);

      for (const stackName of stacksForRegion) {
        awsManager.logVerbose(verbose, `Getting outputs from stack: ${stackName}`);

        const outputs = await awsManager.getStackOutputs(stackName, region);
        outputs.forEach((output) => {
          allStackOutputs.push({ ...output, Region: region });
        });

        awsManager.logVerbose(verbose, `Found ${outputs.length} outputs from ${stackName}`);
      }
    }

    // Get all required parameters from service configs
    const allRequiredParams = new Set<string>();
    Object.values(SERVICE_CONFIGS).forEach((config) => {
      config.requiredParams.forEach((param) => allRequiredParams.add(param));
    });

    // Filter stack outputs to only required ones
    const requiredOutputs: Array<{
      OutputKey: string;
      OutputValue: string;
      ServiceParam: string;
      Region: string;
    }> = [];
    const missingParams: string[] = [];

    for (const output of allStackOutputs) {
      const serviceParamName = pascalToScreamingSnake(output.OutputKey);

      if (allRequiredParams.has(serviceParamName)) {
        requiredOutputs.push({
          OutputKey: output.OutputKey,
          OutputValue: output.OutputValue,
          ServiceParam: serviceParamName,
          Region: output.Region
        });
      }
    }

    // Check for missing required parameters
    allRequiredParams.forEach((requiredParam) => {
      const found = requiredOutputs.some((output) => output.ServiceParam === requiredParam);
      if (!found) {
        missingParams.push(requiredParam);
      }
    });

    // Error if any required parameters are missing
    if (missingParams.length > 0) {
      throw new Error(
        `Missing required parameters from stack outputs: ${missingParams.join(', ')}`
      );
    }

    awsManager.logVerbose(
      verbose,
      `Found ${requiredOutputs.length} required service parameters out of ${allStackOutputs.length} total stack outputs`
    );
    awsManager.logVerbose(
      verbose,
      `Syncing only: ${requiredOutputs.map((o) => o.ServiceParam).join(', ')}`
    );

    // Clean up obsolete service parameters if requested
    if (cleanup) {
      for (const region of regions) {
        // Get all existing service parameters (exclude stack parameters)
        const allParams = await awsManager.getParametersByPath(`/portfolio/${stage}`, region);
        const serviceParams = allParams.filter(
          (param) => param.Name && !param.Name.includes('/stack/')
        );

        // Find parameters that exist in SSM but are not in required outputs
        const requiredParamNames = requiredOutputs.map(
          (output) => `/portfolio/${stage}/${output.ServiceParam}`
        );
        const obsoleteParams = serviceParams.filter((param) => {
          return param.Name && !requiredParamNames.includes(param.Name);
        });

        // Delete obsolete parameters
        for (const param of obsoleteParams) {
          if (param.Name) {
            if (dryRun) {
              awsManager.logVerbose(verbose, `[DRY-RUN] Would delete obsolete: ${param.Name}`);
              totalDeleted++;
            } else {
              await awsManager.deleteParameter(param.Name, region);
              totalDeleted++;

              awsManager.logVerbose(verbose, `Deleted obsolete: ${param.Name}`);
            }
          }
        }
      }
    }

    // Only sync the required parameters
    for (const output of requiredOutputs) {
      const paramPath = `/portfolio/${stage}/${output.ServiceParam}`;

      if (dryRun) {
        awsManager.logVerbose(
          verbose,
          `[DRY-RUN] Would sync: ${paramPath} = ${output.OutputValue}`
        );
        totalSynced++;
      } else {
        await awsManager.putParameter(paramPath, output.OutputValue, output.Region);
        totalSynced++;

        awsManager.logVerbose(verbose, `Synced: ${paramPath} = ${output.OutputValue}`);
      }
    }

    const action = dryRun ? 'Would sync' : 'Synced';
    let message = `✅ ${action} ${totalSynced} service parameters`;

    if (cleanup && totalDeleted > 0) {
      const deleteAction = dryRun ? 'would delete' : 'deleted';
      message += `, ${deleteAction} ${totalDeleted} obsolete parameters`;
    }

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
