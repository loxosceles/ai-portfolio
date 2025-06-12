const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendEnvPath = path.join(process.cwd(), 'frontend', '.env.local');

const environment = process.env.ENVIRONMENT;

if (!environment) {
  console.error('ENVIRONMENT variable is not set');
  process.exit(1);
}

const exportNameMapping = {
  'next-public-appsync-url': 'NEXT_PUBLIC_APPSYNC_URL',
  'next-public-appsync-api-key': 'NEXT_PUBLIC_APPSYNC_API_KEY',
  'next-public-cognito-user-pool-id': 'NEXT_PUBLIC_COGNITO_USER_POOL_ID',
  'next-public-cognito-client-id': 'NEXT_PUBLIC_COGNITO_CLIENT_ID',
  'next-public-cognito-authority': 'NEXT_PUBLIC_COGNITO_AUTHORITY',
  'next-public-redirect-uri': 'NEXT_PUBLIC_REDIRECT_URI',
  'next-public-cognito-domain-name': 'NEXT_PUBLIC_COGNITO_DOMAIN_NAME'
};

function mapExportNameToEnvVar(exportName, value) {
  const mappedKey = exportNameMapping[exportName];
  if (!mappedKey) {
    return null;
  }
  return {
    key: mappedKey,
    value
  };
}

function getStackOutputs(stackName) {
  try {
    const command = `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs'`;
    const output = execSync(command, { encoding: 'utf-8' });
    return JSON.parse(output);
  } catch (error) {
    console.error(`Error getting outputs for stack ${stackName}:`, error.message);
    return [];
  }
}

function getAllOutputs() {
  const sharedStackOutputs = getStackOutputs(`PortfolioSharedStack-${environment}`);
  const apiStackOutputs = getStackOutputs(`PortfolioApiStack-${environment}`);
  
  return [...sharedStackOutputs, ...apiStackOutputs];
}

function readEnvFile(path) {
  if (!fs.existsSync(path)) {
    return {};
  }
  
  const content = fs.readFileSync(path, 'utf8');
  return content.split('\n').reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      acc[key.trim()] = values.join('=').trim();
    }
    return acc;
  }, {});
}

function updateEnvFile() {
  try {
    console.log('Fetching CloudFormation outputs...');
    
    const cfOutputsRaw = getAllOutputs();
    
    // Only include outputs that have a mapping
    const cfOutputs = cfOutputsRaw.reduce((acc, output) => {
      if (output.ExportName) {
        const mapped = mapExportNameToEnvVar(output.ExportName, output.OutputValue);
        if (mapped) {
          acc[mapped.key] = mapped.value;
        }
      }
      return acc;
    }, {});

    console.log('Parsed CloudFormation outputs:', cfOutputs);

    const existingEnv = readEnvFile(frontendEnvPath);
    
    const frontendEnvDir = path.dirname(frontendEnvPath);
    if (!fs.existsSync(frontendEnvDir)) {
      fs.mkdirSync(frontendEnvDir, { recursive: true });
    }

    const updatedEnv = {
      ...existingEnv,
      ...cfOutputs
    };

    const envContent = Object.entries(updatedEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(frontendEnvPath, envContent);
    console.log('Updated environment variables in frontend/.env.local');
  } catch (error) {
    console.error('Error updating environment variables:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

updateEnvFile();
