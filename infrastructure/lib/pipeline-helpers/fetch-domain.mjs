#!/usr/bin/env node

/**
 * Script to fetch domain name from SSM parameter store in us-east-1 region
 * Used by the CI/CD pipeline to get the domain name before CDK deployment
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function fetchDomainName() {
  const environment = process.env.ENVIRONMENT || 'dev';
  
  // Only fetch domain for production
  if (environment !== 'prod') {
    console.error('Not in production environment, skipping domain name fetch');
    return;
  }

  console.error('Fetching domain name from SSM parameter store in us-east-1...');
  
  try {
    // Create SSM client in us-east-1 region
    const ssmClient = new SSMClient({ region: 'us-east-1' });
    
    // Get parameter from SSM
    const command = new GetParameterCommand({
      Name: '/portfolio/prod/PROD_DOMAIN_NAME'
    });
    
    const response = await ssmClient.send(command);
    const domainName = response.Parameter?.Value;
    
    if (!domainName) {
      throw new Error('Parameter exists but has no value');
    }
    
    // Just output the domain name value (for capture by buildspec)
    console.log(domainName);
    
    // Also write to process.env for immediate use
    process.env.PROD_DOMAIN_NAME = domainName;
    
    return domainName;
  } catch (error) {
    console.warn('\n❌ WARNING: Failed to fetch domain name from SSM');
    console.warn(error.message);
    console.warn('\n📋 To fix this, create the SSM parameter:');
    console.warn('aws ssm put-parameter --name "/portfolio/prod/PROD_DOMAIN_NAME" --value "your-domain.com" --type "String" --region us-east-1');
    console.warn('\n💡 Replace "your-domain.com" with your actual domain name.');
    console.warn('\n🔄 Continuing deployment without custom domain...');
    // Don't exit with error - continue deployment without domain
    return undefined;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchDomainName().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { fetchDomainName };