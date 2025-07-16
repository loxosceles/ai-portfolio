import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface IStackOutput {
  id: string;
  value: string;
  description: string;
  exportName: string;
  paramName: string;
}

/**
 * Uploads stack-generated parameters to SSM Parameter Store for post-deployment
 * use. It also creates CloudFormation outputs for these parameters.
 *
 * PURPOSE: This function is for parameters that are CREATED during stack deployment
 * and needed AFTER deployment (e.g., resource IDs, generated URLs, ARNs).
 *
 * PATH: /portfolio/{env}/{paramName} (NOT /portfolio/{env}/stack/)
 *
 * USAGE EXAMPLES:
 * - CloudFront Distribution ID (generated during CloudFront creation)
 * - CloudFront Domain Name (generated during CloudFront creation)
 * - DynamoDB Table ARNs (generated during table creation)
 *
 * @param stack - CDK Stack instance
 * @param stage - Environment stage (dev/prod)
 * @param outputs - Array of output configurations
 */
export const addStackOutputs = (stack: cdk.Stack, stage: string, outputs: IStackOutput[]): void => {
  outputs.forEach((output) => {
    // Stack outputs
    new cdk.CfnOutput(stack, output.id, {
      value: output.value,
      description: output.description,
      exportName: `${output.exportName}-${stage}`
    });

    // SSM Parameters
    new ssm.StringParameter(stack, `${output.id}Param`, {
      parameterName: `/portfolio/${stage}/${output.paramName}`,
      stringValue: output.value,
      description: output.description
    });
  });
};

/**
 * Validates and returns required environment variables with JavaScript naming
 *
 * NOTE: This function is duplicated in env-validation.mjs for use in ESM modules.
 * Any changes here should be reflected there as well.
 *
 * @param requiredEnvVars - Array of required environment variable names
 * @param stage - Environment stage for error message
 * @returns Object with camelCase JavaScript variable names as keys
 * @throws Error if any required environment variables are missing
 */
export const getRequiredEnvVars = (
  requiredEnvVars: string[],
  stage: string
): Record<string, string> => {
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        `Run: pnpm upload-stack-params:${stage}`
    );
  }

  // Convert env var names to camelCase JavaScript variable names
  const envVars: Record<string, string> = {};
  requiredEnvVars.forEach((varName) => {
    const jsVarName = varName
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    envVars[jsVarName] = process.env[varName]!;
  });

  return envVars;
};
