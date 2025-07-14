/**
 * Base Manager Class
 *
 * Provides common functionality for all manager classes
 */
import { BaseManagerConfig } from '../../types/config';
import { Stage } from '../../types/common';
import {
  VALID_REGIONS,
  PARAMETER_SCHEMA,
  SERVICE_REGIONS,
  STACK_NAME_PATTERNS
} from '../../configs/aws-config';
import { SERVICE_CONFIGS } from '../../configs/env-config';

export abstract class BaseManager {
  public config: BaseManagerConfig;
  private stage: Stage;

  constructor(config: BaseManagerConfig) {
    this.config = config;

    // Validate environment at construction time
    const env = process.env.ENVIRONMENT;
    if (!env || !this.config.supportedStages.includes(env)) {
      throw new Error(
        `Invalid or missing ENVIRONMENT: ${env}. Valid stages: ${this.config.supportedStages.join(', ')}`
      );
    }
    this.stage = env as Stage;
  }

  /**
   * Get stage (validated at construction time)
   */
  public getStage(): Stage {
    return this.stage;
  }

  /**
   * Validate stage
   */
  public validateStage(stage: string): boolean {
    if (!this.config.supportedStages.includes(stage)) {
      throw new Error(
        `Invalid stage: ${stage}. Must be one of: ${this.config.supportedStages.join(', ')}`
      );
    }
    return true;
  }

  /**
   * Validate region parameter
   */
  public validateRegion(region: string): string {
    if (!VALID_REGIONS.includes(region)) {
      throw new Error(`Invalid region: ${region}. Valid regions: ${VALID_REGIONS.join(', ')}`);
    }

    return region;
  }

  /**
   * Get regions for current stage from parameter schema
   */
  public getRegionsForStage(): string[] {
    const stageSchema = PARAMETER_SCHEMA[this.stage];
    return Object.keys(stageSchema);
  }

  /**
   * Get service configuration for the specified service
   */
  public getServiceConfig(service: string) {
    const config = SERVICE_CONFIGS[service as keyof typeof SERVICE_CONFIGS];
    if (!config) {
      throw new Error(
        `Unknown service: ${service}. Valid services: ${Object.keys(SERVICE_CONFIGS).join(', ')}`
      );
    }
    return config;
  }

  /**
   * Get region for specific service
   */
  public getRegionForService(service: keyof typeof SERVICE_REGIONS): string {
    return SERVICE_REGIONS[service];
  }

  /**
   * Get stack name for specific service
   */
  public getStackNameForService(service: keyof typeof STACK_NAME_PATTERNS): string {
    return STACK_NAME_PATTERNS[service](this.stage);
  }

  /**
   * Log message if verbose mode is enabled
   */
  public logVerbose(verbose: boolean, message: string): void {
    if (verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }
}
