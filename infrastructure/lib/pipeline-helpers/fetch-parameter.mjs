#!/usr/bin/env node

/**
 * Simple utility to fetch a single parameter from SSM Parameter Store
 * with built-in error handling and fallback values
 * 
 * Usage:
 *   node fetch-parameter.mjs --name /portfolio/dev/BEDROCK_MODEL_ID [--region eu-central-1] [--required] [--fallback default_value]
 * 
 * Options:
 *   --name      Parameter name (required)
 *   --region    AWS region (optional, defaults to eu-central-1)
 *   --required  If specified, exit with error code when parameter is not found
 *   --fallback  Default value to use if parameter is not found
 * 
 * Output:
 *   The parameter value is printed to stdout
 *   Error messages are printed to stderr
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

// Parse command line arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].slice(2);
      const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') 
        ? process.argv[i + 1] 
        : true;
      args[key] = value;
      if (value !== true) i++;
    }
  }
  return args;
}

/**
 * Fetch a parameter from SSM Parameter Store
 * @param {string} paramName - The name of the parameter to fetch
 * @param {string} region - AWS region
 * @returns {Promise<string|null>} - The parameter value or null if not found
 */
async function fetchParameter(paramName, region = 'eu-central-1') {
  try {
    const ssmClient = new SSMClient({ region });
    const command = new GetParameterCommand({ Name: paramName });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error(`Error fetching parameter ${paramName}:`, error.message);
    return null;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs();
  const paramName = args.name;
  const region = args.region || 'eu-central-1';
  const required = args.required === true;
  const hasFallback = 'fallback' in args;
  const fallbackValue = args.fallback;
  
  if (!paramName) {
    console.error('Error: Parameter name is required (--name)');
    process.exit(1);
  }
  
  fetchParameter(paramName, region)
    .then(value => {
      if (value === null) {
        if (hasFallback) {
          console.error(`Parameter ${paramName} not found, using fallback value`);
          console.log(fallbackValue);
          return;
        } else if (required) {
          console.error(`Required parameter ${paramName} not found`);
          process.exit(1);
        } else {
          console.error(`Parameter ${paramName} not found`);
          process.exit(1);
        }
      }
      console.log(value);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      if (hasFallback) {
        console.log(fallbackValue);
      } else {
        process.exit(1);
      }
    });
}

export { fetchParameter };