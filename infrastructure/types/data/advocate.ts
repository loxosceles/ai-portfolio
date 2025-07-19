/**
 * AI Advocate types
 */

/**
 * Recruiter data interface
 */
export interface IRecruiterData {
  linkId: string;
  companyName?: string;
  recruiterName?: string;
  context?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  jobTitle?: string;
  jobDescription?: string;
  companyIndustry?: string;
  companySize?: string;
  conversationHistory?: Array<{ role: string; content: string; timestamp?: number }>;
  message?: string;
  greeting?: string;
  skills?: string[];
}

/**
 * AI Advocate greeting response interface
 */
export interface IAdvocateGreetingResponse {
  linkId: string;
  companyName?: string;
  recruiterName?: string;
  context?: string;
  greeting?: string;
  message?: string;
  skills?: string[];
}

/**
 * AI Answer response interface
 */
export interface IAIAnswerResponse {
  answer: string;
  context?: string;
}

/**
 * Prompt response interface
 */
export interface IPromptResponse {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * AppSync event interface
 */
export interface IAppSyncEvent {
  info: {
    fieldName: string;
  };
  identity?: {
    claims: Record<string, string>;
  };
  arguments?: Record<string, any>;
}
