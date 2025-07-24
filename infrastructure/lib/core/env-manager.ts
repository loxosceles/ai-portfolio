import * as dotenv from 'dotenv';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseManager } from './base-manager';
import { IEnvironmentManagerConfig } from '../../types/config';
import { StackEnvMap } from '../../types';

export class EnvironmentManager extends BaseManager {
  private envConfig: IEnvironmentManagerConfig;

  constructor(config: IEnvironmentManagerConfig) {
    super(config);
    this.envConfig = config;
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

    // Get stack service config
    const stackService = this.envConfig.serviceConfigs.stack;
    if (!stackService || stackService.type !== 'stack') {
      throw new Error('Stack service configuration not found');
    }

    const requiredVars = stackService.stackConfigs[stackName]?.requiredVars;
    if (!requiredVars) {
      throw new Error(`Unknown stack: ${stackName}`);
    }

    // Validate required variables
    const missingVars = this.validateEnv(env, requiredVars);
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for ${stackName} stack: ${missingVars.join(', ')}`
      );
    }

    // Build result object with stage and camelCase environment variables
    const result: Record<string, string> = { stage };

    // Convert SNAKE_CASE env vars to camelCase properties
    for (const varName of requiredVars) {
      const camelCaseKey = this.toCamelCase(varName);
      result[camelCaseKey] = env[varName];
    }

    // Safe type assertion: we've validated all required vars exist and converted them to camelCase
    // Double assertion through 'unknown' is needed because TypeScript can't verify structural compatibility
    // between Record<string, string> and the specific stack environment interfaces at compile time
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
   * Validate required environment variables
   */
  validateEnv(env: Record<string, string>, required: string[]): string[] {
    const missing = required.filter((key) => !env[key]);
    return missing;
  }

  /**
   * Convert SNAKE_CASE to camelCase
   */
  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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
    const serviceConfig = this.envConfig.serviceConfigs[service];
    if (!serviceConfig) {
      throw new Error(`Unknown service: ${service}`);
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
