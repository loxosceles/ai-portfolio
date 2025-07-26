import * as dotenv from 'dotenv';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseManager } from './base-manager';
import { IEnvironmentManagerConfig } from '../../types/config';
import { StackEnvMap } from '../../types';
import { toCamelCase } from '../../utils/generic';

export class EnvironmentManager extends BaseManager {
  private envConfig: IEnvironmentManagerConfig;

  constructor(config: IEnvironmentManagerConfig) {
    super(config);
    this.envConfig = config;

    // Validate configuration
    if (!config.infrastructureEnvPaths) {
      throw new Error('infrastructureEnvPaths must be provided');
    }
    if (!config.serviceConfigs) {
      throw new Error('serviceConfigs must be provided');
    }
  }

  /**
   * Get validated environment variables for a specific stack
   *
   * @param stackName - Name of the stack (api, web, aiAdvocate, shared)
   * @returns Object with required environment variables for the stack
   * @throws Error if any required variables are missing
   */
  getStackEnv<T extends keyof StackEnvMap>(stackName: T): StackEnvMap[T] {
    const stage = this.getStage();
    const env = this.loadEnv(stage);

    // Get all variables for this stack and stage
    const { allVars, optionalVars } = this.getStackVars(stackName, stage);

    // Check each variable and categorize missing ones
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    for (const varName of allVars) {
      if (!env[varName]) {
        if (optionalVars.includes(varName)) {
          missingOptional.push(varName);
        } else {
          missingRequired.push(varName);
        }
      }
    }

    // Error for missing required, warn for missing optional
    if (missingRequired.length > 0) {
      throw new Error(
        `Missing required environment variables for ${stackName} stack: ${missingRequired.join(', ')}`
      );
    }
    if (missingOptional.length > 0) {
      console.warn(
        `Warning: Optional variables not found for ${stackName} stack: ${missingOptional.join(', ')}`
      );
    }

    // Build result with available variables
    const result: Record<string, string> = { stage };
    for (const varName of allVars) {
      if (env[varName]) {
        result[toCamelCase(varName)] = env[varName];
      }
    }

    return result as unknown as StackEnvMap[T];
  }

  /**
   * Load environment variables from .env files
   */
  loadEnv(stage?: string): Record<string, string> {
    // Load base env file
    const baseEnvPath = path.join(
      this.config.projectRoot,
      this.envConfig.infrastructureEnvPaths.base
    );
    const baseEnv = dotenv.config({ path: baseEnvPath }).parsed || {};

    // If stage is provided, load stage-specific env
    let stageEnv: Record<string, string> = {};
    if (stage) {
      this.validateStage(stage);
      const stageEnvPath = path.join(
        this.config.projectRoot,
        this.envConfig.infrastructureEnvPaths.stage(stage)
      );

      try {
        const stageEnvContent = fsSync.readFileSync(stageEnvPath, 'utf-8');
        stageEnv = dotenv.parse(stageEnvContent);
      } catch (err) {
        // Stage-specific env file might not exist, which is fine
        console.warn(`Note: No stage-specific env file found at ${stageEnvPath}`);
        console.warn(`Warning: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Merge base and stage-specific environment variables
    // Stage-specific variables override base variables
    return { ...baseEnv, ...stageEnv };
  }

  /**
   * Get all variables (base + stage-specific) and optional variables for a stack
   */
  private getStackVars(stackName: string, stage: string) {
    // Maintain the same validation level as before
    const stackService = this.envConfig.serviceConfigs?.stack;
    if (!stackService || stackService.type !== 'stack') {
      throw new Error('Stack service configuration not found');
    }

    const stackConfig = stackService.stackConfigs[stackName];
    if (!stackConfig) {
      throw new Error(`Unknown stack: ${stackName}`);
    }

    const baseVars = stackConfig.base || [];
    const prodVars = stage === 'prod' ? stackConfig.prod || [] : [];
    const allVars = [...baseVars, ...prodVars];
    const optionalVars = stackConfig.optional || [];

    return { allVars, optionalVars };
  }

  /**
   * Validate required environment variables
   */
  validateEnv(env: Record<string, string>, required: string[]): string[] {
    return required.filter((key) => !env[key]);
  }

  /**
   * Write environment file
   */
  async writeEnvFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
  }

  /**
   * Generate environment file content for a service
   */
  generateServiceEnvContent(service: string, params: Record<string, string>): string {
    const serviceConfig = this.envConfig.serviceConfigs?.[service];
    if (!serviceConfig) {
      throw new Error(
        `Service '${service}' not configured. Available services: ${Object.keys(this.envConfig.serviceConfigs || {}).join(', ')}`
      );
    }

    // Only handle frontend and link-generator services (not stack service)
    if (serviceConfig.type === 'stack') {
      throw new Error(`Cannot generate env content for stack service: ${service}`);
    }

    // Generate environment file content
    let content = '# Generated environment file - DO NOT EDIT\n';

    // Add required parameters
    for (const param of serviceConfig.requiredParams) {
      if (!params[param]) {
        throw new Error(`Missing required parameter: ${param}`);
      }
      content += `${serviceConfig.prefix}${param}=${params[param]}\n`;
    }

    // Add additional parameters
    if (serviceConfig.additionalParams) {
      for (const [key, value] of Object.entries(serviceConfig.additionalParams)) {
        content += `${key}=${value}\n`;
      }
    }

    return content;
  }
}
