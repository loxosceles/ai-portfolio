/**
 * Stack environment type mapping
 */
import { IStackEnv } from './stack-env';

// Import stack-specific environment interfaces
export interface IWebStackEnv extends IStackEnv {
  visitorTableName: string;
}

export interface IApiStackEnv extends IStackEnv {
  developerTableName: string;
  projectsTableName: string;
  dataBucketName: string;
  awsRegionDefault: string;
}

export interface IAIAdvocateStackEnv extends IStackEnv {
  bedrockModelId: string;
  awsRegionDefault: string;
  developerTableName: string;
  projectsTableName: string;
}

export interface ISharedStackEnv extends IStackEnv {
  awsAdminArn: string;
}

export interface IPipelineStackEnv extends IStackEnv {
  // No additional variables needed for pipeline stack currently
}

/**
 * Type mapping for stack environment inference
 */
export interface StackEnvMap {
  web: IWebStackEnv;
  api: IApiStackEnv;
  aiAdvocate: IAIAdvocateStackEnv;
  shared: ISharedStackEnv;
  pipeline: IPipelineStackEnv;
}
