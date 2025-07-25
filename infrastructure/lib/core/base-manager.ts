/**
 * Base Manager Class
 *
 * Provides common functionality for all manager classes
 */
import { IBaseManagerConfig } from '../../types/config';
import { Stage } from '../../types/common';

export abstract class BaseManager {
  public config: IBaseManagerConfig;
  private stage: Stage;

  constructor(config: IBaseManagerConfig) {
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
   * Static method for verbose logging - can be used without manager instance
   */
  public static logVerbose(verbose: boolean, message: string): void {
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`[VERBOSE] ${message}`);
    }
  }

  /**
   * Instance method that calls the static method (like cls.method in Python)
   */
  public logVerbose(verbose: boolean, message: string): void {
    (this.constructor as typeof BaseManager).logVerbose(verbose, message);
  }
}
