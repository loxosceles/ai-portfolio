import * as path from 'path';
import * as fs from 'fs';
import { IUploadOptions, IExportOptions, IExportResult } from '../../../types/cli/ssm-params';
import { AWSManager } from '../../core/aws-manager';
import { EnvironmentManager } from '../../core/env-manager';
import { BaseManager } from '../../core/base-manager';
import { awsManagerConfig, PARAMETER_SCHEMA } from '../../../configs/aws-config';
import { envManagerConfig } from '../../../configs/env-config';
import { buildSSMPath } from '../../../utils/ssm';

// Create manager instances
const awsManager = new AWSManager(awsManagerConfig);
const envManager = new EnvironmentManager(envManagerConfig);

/**
 * Handle upload parameters command
 */
export async function handleUploadParameters(options: IUploadOptions) {
  try {
    const { region, dryRun, verbose, target } = options;

    if (!target) {
      throw new Error('target is required for upload command');
    }

    const stage = awsManager.getStage();

    // Load environment variables using EnvironmentManager
    const params = envManager.loadEnv(stage);

    // Process regions
    const regions = region ? [region] : awsManager.getRegionsForStage();

    let totalErrors = 0;

    for (const r of regions) {
      // Cleanup existing stack parameters before upload
      BaseManager.logVerbose(
        verbose,
        `Cleaning up existing parameters for target '${target}' in ${r}...`
      );
      try {
        const cleanupPath = buildSSMPath(stage, 'stack');
        if (dryRun) {
          BaseManager.logVerbose(
            verbose,
            `[DRY-RUN] Would delete all parameters under path: ${cleanupPath} in ${r}`
          );
        } else {
          const deleteCount = await awsManager.deleteParametersByPath(cleanupPath, r, verbose);
          BaseManager.logVerbose(
            verbose && deleteCount > 0,
            `✅ Cleaned up ${deleteCount} parameters from ${cleanupPath}`
          );
        }
      } catch (error) {
        console.error(`Warning: Cleanup failed for ${r}: ${error}`);
        // Don't fail the entire operation due to cleanup issues
      }

      // Upload parameters
      const regionParams = PARAMETER_SCHEMA[stage][r];
      if (!regionParams || regionParams.length === 0) {
        BaseManager.logVerbose(verbose, `No parameters configured for ${stage} in ${r}`);
        continue;
      }

      if (dryRun) {
        BaseManager.logVerbose(
          verbose,
          `[DRY-RUN] Would upload stack parameters for ${stage} stage to ${r}...`
        );
        for (const paramName of regionParams) {
          BaseManager.logVerbose(verbose, `Processing parameter: ${paramName}`);
          if (!params[paramName]) {
            console.warn(`Warning: Parameter ${paramName} not found in environment files`);
            totalErrors++;
            continue;
          }
          const paramPath = buildSSMPath(stage, 'stack', paramName);
          const paramValue = params[paramName];
          BaseManager.logVerbose(
            verbose,
            `[DRY-RUN] Would upload: ${paramPath} = ${paramValue} (to ${r})`
          );
        }
      } else {
        BaseManager.logVerbose(verbose, `Uploading stack parameters for ${stage} stage to ${r}...`);
        let uploadCount = 0;
        let errorCount = 0;

        for (const paramName of regionParams) {
          BaseManager.logVerbose(verbose, `Processing parameter: ${paramName}`);
          if (!params[paramName]) {
            console.warn(`Warning: Parameter ${paramName} not found in environment files`);
            errorCount++;
            continue;
          }

          const paramPath = buildSSMPath(stage, 'stack', paramName);
          const paramValue = params[paramName];

          try {
            BaseManager.logVerbose(verbose, `Uploading: ${paramPath} = ${paramValue} (to ${r})`);
            await awsManager.putParameter(paramPath, paramValue, r);
            uploadCount++;
          } catch (error) {
            console.error(`Error: Failed to upload ${paramName} to ${r}: ${error}`);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          BaseManager.logVerbose(
            verbose,
            `✅ Successfully uploaded ${uploadCount} parameters to ${r}`
          );
        } else {
          console.error(`⚠️ Uploaded ${uploadCount} parameters to ${r} with ${errorCount} errors`);
        }
        totalErrors += errorCount;
      }
    }

    return {
      success: totalErrors === 0,
      message:
        totalErrors === 0
          ? '✅ All parameters uploaded successfully'
          : `⚠️ Completed with ${totalErrors} errors`,
      errorCount: totalErrors
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to upload parameters: ${error instanceof Error ? error.message : String(error)}`,
      errorCount: 1
    };
  }
}

/**
 * Handle export parameters command
 */
export async function handleExportParameters(options: IExportOptions): Promise<IExportResult> {
  try {
    const { regions, scope, format, target, output, outputPath, verbose } = options;

    if (!target) {
      throw new Error('target is required for export command');
    }

    const stage = awsManager.getStage();

    // Process regions
    const regionsToUse = regions || awsManager.getRegionsForStage();

    const allParams: Record<string, string> = {};
    let totalErrors = 0;

    // Download parameters from each region
    for (const r of regionsToUse) {
      try {
        // Construct the path based on scope or target
        let paramPath;
        if (target === 'infrastructure') {
          // Infrastructure target always uses stack scope
          paramPath = buildSSMPath(stage, 'stack');
        } else {
          // Other targets use provided scope or base path
          paramPath = scope ? buildSSMPath(stage, scope) : buildSSMPath(stage);
        }
        const path = paramPath;

        // Get parameters by path
        BaseManager.logVerbose(verbose, `Downloading parameters from region: ${r}`);
        const ssmParams = await awsManager.getParametersByPath(path, r);

        // Process parameters
        for (const param of ssmParams) {
          if (param.Name && param.Value) {
            // Extract parameter name from path
            const paramName = param.Name.split('/').pop() as string;
            allParams[paramName] = param.Value;
            BaseManager.logVerbose(verbose, `Downloaded: ${paramName} = ${param.Value}`);
          }
        }
      } catch (error) {
        console.error(`Error getting parameters from region ${r}: ${error}`);
        totalErrors++;
      }
    }

    // Filter by target if specified
    let params = allParams;
    if (target) {
      if (target === 'infrastructure') {
        // Infrastructure target - use all params as-is
        params = allParams;
      } else {
        // Service target - filter by service config
        const serviceConfig = envManagerConfig.serviceConfigs[target];
        if (!serviceConfig) {
          throw new Error(
            `Unknown target: ${target}. Valid targets: infrastructure, ${Object.keys(envManagerConfig.serviceConfigs).join(', ')}`
          );
        }

        // Skip stack services - they don't generate env files
        if (serviceConfig.type === 'stack') {
          throw new Error(`Cannot export parameters for stack service: ${target}`);
        }

        // Filter to only required params for this service
        params = {};
        const missingParams: string[] = [];

        for (const paramName of serviceConfig.requiredParams) {
          if (allParams[paramName]) {
            const key = serviceConfig.prefix + paramName;
            params[key] = allParams[paramName];
          } else {
            missingParams.push(paramName);
          }
        }

        if (missingParams.length > 0) {
          throw new Error(
            `Missing required parameters for target '${target}': ${missingParams.join(', ')}`
          );
        }

        // Add additional params
        Object.assign(params, serviceConfig.additionalParams);
      }
    }

    // Format the output
    let content = '';
    if (format === 'env') {
      content = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Ensure there's a newline at the end
      if (content && !content.endsWith('\n')) {
        content += '\n';
      }
    } else if (format === 'json') {
      content = JSON.stringify(params, null, 2);
    }

    // Handle output
    if (!output) {
      // Console log by default
      process.stdout.write(content);
    } else {
      // Determine output path
      let finalOutputPath: string;

      if (outputPath) {
        // Custom path specified - use with warning if target also specified
        if (target) {
          console.warn(
            `Warning: Using custom output path '${outputPath}' instead of ${target} config path`
          );
        }
        finalOutputPath = outputPath;
      } else if (target === 'infrastructure') {
        // Use infrastructure config path
        const isCI = process.env.CODEBUILD_BUILD_ID || process.env.CI;
        finalOutputPath = isCI
          ? path.join(awsManagerConfig.projectRoot, envManagerConfig.infrastructureEnvPaths.runtime)
          : path.join(
              awsManagerConfig.projectRoot,
              envManagerConfig.infrastructureEnvPaths.stage(stage)
            );
      } else if (target) {
        // Use service config path
        const serviceConfig = envManagerConfig.serviceConfigs[target];

        // Skip stack services - they don't have envPath
        if (serviceConfig.type === 'stack') {
          throw new Error(`Cannot determine output path for stack service: ${target}`);
        }

        finalOutputPath = path.join(awsManagerConfig.projectRoot, serviceConfig.envPath);
      } else {
        throw new Error('Cannot determine output path: target is required');
      }

      // Handle overwrite protection based on environment and target type
      const isCI = process.env.CODEBUILD_BUILD_ID || process.env.CI;
      const isInfrastructureTarget =
        target === 'infrastructure' || (!target && finalOutputPath.includes('infrastructure'));

      if (!isCI) {
        if (isInfrastructureTarget) {
          // Infrastructure files require custom output path in local development
          if (!outputPath) {
            console.error(
              `❌ Error: Infrastructure files require --output-path in local development.`
            );
            console.error(
              `   Use: ssm-params export --target=infrastructure --output --output-path=/path/to/custom.env`
            );
            console.error(`   Or console output: ssm-params export --target=infrastructure`);
            throw new Error('Infrastructure files require custom output path locally');
          }
        } else {
          // Service files can overwrite default paths (auto-generated)
          if (fs.existsSync(finalOutputPath)) {
            console.warn(`⚠️  Overwriting auto-generated file at ${finalOutputPath}`);
          }
        }
      }
      // CI environments can overwrite any file without restrictions

      await envManager.writeEnvFile(finalOutputPath, content);
      BaseManager.logVerbose(verbose, `✅ Parameters written to ${finalOutputPath}`);
    }

    return {
      success: totalErrors === 0,
      message:
        totalErrors === 0
          ? '✅ Parameters exported successfully'
          : `⚠️ Completed with ${totalErrors} errors`,
      errorCount: totalErrors,
      content
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to export parameters: ${error instanceof Error ? error.message : String(error)}`,
      errorCount: 1,
      content: ''
    };
  }
}
