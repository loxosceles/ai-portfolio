import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface StackOutput {
  id: string;
  value: string;
  description: string;
  exportName: string;
  paramName: string;
}

export const addStackOutputs = (stack: cdk.Stack, stage: string, outputs: StackOutput[]): void => {
  outputs.forEach((output) => {
    // Stack outputs
    new cdk.CfnOutput(stack, output.id, {
      value: output.value,
      description: output.description,
      exportName: output.exportName
    });

    // SSM Parameters
    new ssm.StringParameter(stack, `${output.id}Param`, {
      parameterName: `/portfolio/${stage}/${output.paramName}`,
      stringValue: output.value,
      description: output.description
    });
  });
};
