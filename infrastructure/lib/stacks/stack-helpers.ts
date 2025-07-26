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
