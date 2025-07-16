import * as dotenv from 'dotenv';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseManager } from './base-manager';
import { IEnvironmentManagerConfig } from '../../types/config';

export class EnvironmentManager extends BaseManager {
  private envConfig: IEnvironmentManagerConfig;

  constructor(config: IEnvironmentManagerConfig) {
    super(config);
    this.envConfig = config;
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
        console.warn(err);
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
