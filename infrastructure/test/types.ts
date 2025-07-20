/**
 * Shared types for tests
 */

import {
  IDeveloper as DeveloperType,
  IProject as ProjectType,
  IRecruiterData as RecruiterDataType,
  IAdvocateGreetingResponse as AdvocateGreetingResponseType,
  IAIAnswerResponse as AIAnswerResponseType,
  IPromptResponse as PromptResponseType,
  IAppSyncEvent as AppSyncEventType
} from '../types/data';

import {
  ICloudFrontHeader as CloudFrontHeaderType,
  ICloudFrontHeaders as CloudFrontHeadersType,
  ICloudFrontRequest as CloudFrontRequestType,
  ICloudFrontResponse as CloudFrontResponseType,
  ICloudFrontEvent as CloudFrontEventType
} from '../types/aws';

// Re-export application types with test-friendly names
export type DeveloperData = DeveloperType;
export type ProjectData = ProjectType;
export type RecruiterData = RecruiterDataType;
export type AdvocateGreetingResponse = AdvocateGreetingResponseType;
export type AIAnswerResponse = AIAnswerResponseType;
export type PromptResponse = PromptResponseType;
export type AppSyncEvent = AppSyncEventType;
export type CloudFrontHeader = CloudFrontHeaderType;
export type CloudFrontHeaders = CloudFrontHeadersType;
export type CloudFrontRequest = CloudFrontRequestType;
export type CloudFrontResponse = CloudFrontResponseType;
export type CloudFrontEvent = CloudFrontEventType;

// Test-specific module interfaces
export interface AIAdvocateModule {
  handler: (event: AppSyncEvent) => Promise<AdvocateGreetingResponse | AIAnswerResponse | boolean>;
  generateAIGreeting?: (recruiterData: RecruiterData) => Promise<string>;
  generateAIResponse?: (question: string, recruiterData: RecruiterData) => Promise<string>;
}

export interface PromptGeneratorModule {
  generateGreetingPrompt: (recruiterData: RecruiterData) => Promise<PromptResponse>;
  generateDynamicPrompt: (
    question: string,
    recruiterData: RecruiterData
  ) => Promise<PromptResponse>;
}

export interface EdgeFunctionModule {
  handler: (event: CloudFrontEvent) => Promise<CloudFrontRequest | CloudFrontResponse>;
}
