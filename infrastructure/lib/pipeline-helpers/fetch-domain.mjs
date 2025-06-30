#!/usr/bin/env node

/**
 * Script to fetch domain name and certificate ARN from SSM parameter store in us-east-1 region
 * Used by the CI/CD pipeline to get the domain name and certificate ARN before CDK deployment
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function fetchDomainInfo() {
  const environment = process.env.ENVIRONMENT || 'dev';

  // Only fetch domain info for production
  if (environment !== 'prod') {
    console.error('Not in production environment, skipping domain info fetch');
    return;
  }

  console.error('Fetching domain info from SSM parameter store in us-east-1...');

  try {
    // Create SSM client in us-east-1 region
    const ssmClient = new SSMClient({ region: 'us-east-1' });

    // Get domain name from SSM
    const domainCommand = new GetParameterCommand({
      Name: '/portfolio/prod/PROD_DOMAIN_NAME'
    });

    const domainResponse = await ssmClient.send(domainCommand);
    const domainName = domainResponse.Parameter?.Value;

    if (!domainName) {
      throw new Error('Domain parameter exists but has no value');
    }

    // Get certificate ARN from SSM
    const certCommand = new GetParameterCommand({
      Name: '/portfolio/prod/PROD_CERTIFICATE_ARN'
    });

    const certResponse = await ssmClient.send(certCommand);
    const certificateArn = certResponse.Parameter?.Value;

    if (!certificateArn) {
      throw new Error('Certificate ARN parameter exists but has no value');
    }

    // Output both values in a format that can be captured by shell script
    // Format: DOMAIN_NAME|CERTIFICATE_ARN
    console.log(`${domainName}|${certificateArn}`);
    console.error(`Domain name: ${domainName}`);
    console.error(`Certificate ARN: ${certificateArn}`);

    return { domainName, certificateArn };
  } catch (error) {
    console.warn('\n❌ WARNING: Failed to fetch domain info from SSM');
    console.warn(error.message);
    console.warn('\n📋 To fix this, create the SSM parameters:');
    console.warn(
      'aws ssm put-parameter --name "/portfolio/prod/PROD_DOMAIN_NAME" --value "your-domain.com" --type "String" --region us-east-1'
    );
    console.warn(
      'aws ssm put-parameter --name "/portfolio/prod/PROD_CERTIFICATE_ARN" --value "your-certificate-arn" --type "String" --region us-east-1'
    );
    console.warn('\n💡 Replace "your-domain.com" with your actual domain name.');
    console.warn('\n💡 Replace "your-certificate-arn" with your actual certificate ARN.');
    console.warn('\n🔄 Continuing deployment without custom domain...');
    // Don't exit with error - continue deployment without domain
    return undefined;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchDomainInfo().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { fetchDomainInfo };
