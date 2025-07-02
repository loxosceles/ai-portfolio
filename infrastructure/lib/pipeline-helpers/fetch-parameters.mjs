#!/usr/bin/env node

/**
 * Generic utility to fetch parameters from SSM Parameter Store
 * Supports fetching single or multiple parameters with proper error handling
 * 
 * Usage:
 *   Single parameter: node fetch-parameters.mjs --name /portfolio/dev/BEDROCK_MODEL_ID
 *   Multiple parameters: node fetch-parameters.mjs --names /portfolio/dev/PARAM1,/portfolio/dev/PARAM2
 *   With region: node fetch-parameters.mjs --name /portfolio/dev/PARAM --region us-east-1
 *   Output format: node fetch-parameters.mjs --name /portfolio/dev/PARAM --format json|shell|bash (default: shell)
 */

import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';

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
 * Fetch a single parameter from SSM
 * @param {string} name - Parameter name
 * @param {string} region - AWS region
 * @returns {Promise<string|null>} - Parameter value or null if not found
 */
async function fetchParameter(name, region = 'eu-central-1') {
  try {
    const ssmClient = new SSMClient({ region });
    const command = new GetParameterCommand({ Name: name });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value || null;
  } catch (error) {
    console.error(`Error fetching parameter ${name}:`, error.message);
    return null;
  }
}

/**
 * Fetch multiple parameters from SSM
 * @param {string[]} names - Array of parameter names
 * @param {string} region - AWS region
 * @returns {Promise<Object>} - Object with parameter names as keys and values
 */
async function fetchParameters(names, region = 'eu-central-1') {
  try {
    const ssmClient = new SSMClient({ region });
    const command = new GetParametersCommand({ Names: names });
    const response = await ssmClient.send(command);
    
    const result = {};
    
    // Process successful parameters
    response.Parameters?.forEach(param => {
      // Extract the parameter name without the path
      const shortName = param.Name.split('/').pop();
      result[shortName] = param.Value;
    });
    
    // Log any invalid parameters
    if (response.InvalidParameters?.length > 0) {
      console.error('Invalid parameters:', response.InvalidParameters.join(', '));
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching parameters:', error.message);
    return {};
  }
}

/**
 * Format the output based on the specified format
 * @param {Object|string} data - The data to format
 * @param {string} format - Output format (json, shell, or bash)
 * @returns {string} - Formatted output
 */
function formatOutput(data, format = 'shell') {
  if (format.toLowerCase() === 'json') {
    return JSON.stringify(data);
  } else if (format.toLowerCase() === 'bash') {
    // Format specifically for bash variable assignment
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}="${value?.replace(/"/g, '\\"')}"`)
        .join('\n');
    } else {
      return data;
    }
  } else {
    // Default shell format
    if (typeof data === 'string') {
      return data;
    } else {
      return Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    }
  }
}

/**
 * Main function to fetch parameters based on command line arguments
 */
async function main() {
  const args = parseArgs();
  const region = args.region || 'eu-central-1';
  const format = args.format || 'shell';
  
  let result;
  
  if (args.name) {
    // Fetch a single parameter
    result = await fetchParameter(args.name, region);
  } else if (args.names) {
    // Fetch multiple parameters
    const paramNames = args.names.split(',');
    result = await fetchParameters(paramNames, region);
  } else {
    console.error('Error: Missing required parameter. Use --name or --names');
    process.exit(1);
  }
  
  if (result === null || (typeof result === 'object' && Object.keys(result).length === 0)) {
    console.error('No parameters found or error occurred');
    process.exit(1);
  }
  
  // Output the result in the specified format
  console.log(formatOutput(result, format));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { fetchParameter, fetchParameters };