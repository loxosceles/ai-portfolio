import * as path from 'path';
import { IExportOptions, IExportResult } from '../../../types/cli/ssm-params';
import { AWSManager } from '../../core/aws-manager';
import { EnvironmentManager } from '../../core/env-manager';
import { awsManagerConfig } from '../../../configs/aws-config';
import { envManagerConfig } from '../../../configs/env-config';

// Create manager instances
const awsManager = new AWSManager(awsManagerConfig);
const envManager = new EnvironmentManager(envManagerConfig);

/**
 * Handle upload parameters command
 */
export async function handleUploadParameters(options: {
  region?: string;
  dryRun?: boolean;
  verbose?: boolean;
}) {
  try {
    const { region, dryRun = false, verbose = false } = options;
    const stage = awsManager.getStage();

    // Load environment variables using EnvironmentManager
    const params = envManager.loadEnv(stage);

    // Process regions
    const regions = region ? [region] : awsManager.getRegionsForStage();

    let totalErrors = 0;

    for (const r of regions) {
      if (dryRun) {
        totalErrors += awsManager.simulateUploadParameters(stage, params, r, verbose);
      } else {
        totalErrors += await awsManager.uploadParameters(stage, params, r, verbose);
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
    const { regions, scope, format = 'env', target, output, outputPath, verbose = false } = options;
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
          paramPath = `/portfolio/${stage}/stack`;
        } else {
          // Other targets use provided scope or base path
          paramPath = scope ? `/portfolio/${stage}/${scope}` : `/portfolio/${stage}`;
        }
        const path = paramPath;

        // Get parameters by path
        const ssmParams = await awsManager.getParametersByPath(path, r);

        // Process parameters
        for (const param of ssmParams) {
          if (param.Name && param.Value) {
            // Extract parameter name from path
            const paramName = param.Name.split('/').pop() as string;
            allParams[paramName] = param.Value;
            if (verbose) {
              // eslint-disable-next-line no-console
              console.log(`Downloaded: ${paramName} = ${param.Value}`);
            }
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
        finalOutputPath = path.join(awsManagerConfig.projectRoot, serviceConfig.envPath);
      } else {
        // Default to infrastructure path when no target specified
        const isCI = process.env.CODEBUILD_BUILD_ID || process.env.CI;
        finalOutputPath = isCI
          ? path.join(awsManagerConfig.projectRoot, envManagerConfig.infrastructureEnvPaths.runtime)
          : path.join(
              awsManagerConfig.projectRoot,
              envManagerConfig.infrastructureEnvPaths.stage(stage)
            );
      }

      // Handle overwrite protection based on environment and target type
      const fs = require('fs');
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
      // eslint-disable-next-line no-console
      console.log(`✅ Parameters written to ${finalOutputPath}`);
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
