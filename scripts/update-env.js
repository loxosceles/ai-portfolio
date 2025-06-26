#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const environment = process.env.ENVIRONMENT || 'dev';
const mainRegion = 'eu-central-1';
const edgeRegion = 'us-east-1';
const jobMatchingRegion = 'eu-central-1';

function getSSMParameters(region, pathPrefix = null) {
  try {
    const command = pathPrefix
      ? `aws ssm get-parameters-by-path --path "${pathPrefix}" --recursive --region ${region}`
      : `aws ssm get-parameters-by-path --path "/portfolio/${environment}/" --recursive --region ${region}`;

    const output = execSync(command, { encoding: 'utf-8' });
    const response = JSON.parse(output);

    const params = {};
    response.Parameters.forEach((param) => {
      const key = param.Name.split('/').pop();
      params[key] = param.Value;
    });

    return params;
  } catch (error) {
    console.error(`Error fetching parameters from ${region}:`, error.message);
    return {};
  }
}

function updateFrontendEnv() {
  console.log('Updating frontend environment...');

  const mainParams = getSSMParameters(mainRegion);
  const jobMatchingParams = getSSMParameters(
    jobMatchingRegion,
    `/portfolio/${environment}/job-matching/`
  );
  const frontendParams = {};

  // Add main parameters
  Object.entries(mainParams).forEach(([key, value]) => {
    if (key.startsWith('NEXT_PUBLIC_')) {
      frontendParams[key] = value;
    }
  });

  // Add job matching parameters
  if (jobMatchingParams['NEXT_PUBLIC_JOB_MATCHING_API_URL']) {
    frontendParams['NEXT_PUBLIC_JOB_MATCHING_API_URL'] =
      jobMatchingParams['NEXT_PUBLIC_JOB_MATCHING_API_URL'];
  }
  
  // Always set NEXT_PUBLIC_ENVIRONMENT to 'local' for local development
  frontendParams['NEXT_PUBLIC_ENVIRONMENT'] = 'local';

  const envPath = path.join(process.cwd(), 'frontend', '.env.local');
  const envContent = Object.entries(frontendParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Frontend env updated: ${Object.keys(frontendParams).length} variables`);
}

function updateLinkGeneratorEnv() {
  console.log('Updating link-generator environment...');

  const mainParams = getSSMParameters(mainRegion);
  const edgeParams = getSSMParameters(edgeRegion);

  const envContent = [
    `DYNAMODB_TABLE_NAME=${edgeParams['visitor-table-name']}`,
    `COGNITO_USER_POOL_ID=${mainParams['NEXT_PUBLIC_COGNITO_USER_POOL_ID']}`,
    `COGNITO_CLIENT_ID=${mainParams['NEXT_PUBLIC_COGNITO_CLIENT_ID']}`,
    `AWS_REGION_DYNAMODB=${edgeRegion}`,
    `AWS_REGION_COGNITO=${mainRegion}`,
    `OUTPUT_FILE_PATH=./link.txt`,
    `DOMAIN_URL=https://${edgeParams['WEB_CLOUDFRONT_DOMAIN']}/`
  ].join('\n');

  const envPath = path.join(process.cwd(), 'link-generator', '.env');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Link-generator env updated');
}

function main() {
  const target = process.argv[2] || '--all';

  console.log(`🔄 Updating environment files for: ${environment}`);

  try {
    switch (target) {
      case '--frontend':
        updateFrontendEnv();
        break;
      case '--link-generator':
        updateLinkGeneratorEnv();
        break;
      case '--all':
      default:
        updateFrontendEnv();
        updateLinkGeneratorEnv();
        break;
    }
    console.log('✅ Environment update completed');
  } catch (error) {
    console.error('❌ Environment update failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateFrontendEnv, updateLinkGeneratorEnv };
