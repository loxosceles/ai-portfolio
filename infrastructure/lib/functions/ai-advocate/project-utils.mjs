import { ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Get developer projects from DynamoDB
 * @param {object} docClient - DynamoDB Document Client
 * @param {string} developerId - The developer's ID
 * @returns {Array} - Array of project objects
 */
export async function getDeveloperProjects(docClient, developerId) {
  try {
    const tableName = process.env.PROJECTS_TABLE_NAME;
    
    if (!tableName) {
      throw new Error('PROJECTS_TABLE_NAME environment variable is not set');
    }
    
    if (!developerId) {
      throw new Error('Developer ID is required to fetch projects');
    }
    
    // Query the table for projects with this developerId
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'developerId = :devId',
      ExpressionAttributeValues: {
        ':devId': developerId
      }
    });
    
    const response = await docClient.send(command);
    
    if (!response.Items) {
      throw new Error(`Failed to retrieve projects for developer: ${developerId}`);
    }
    
    return response.Items;
  } catch (error) {
    console.error('Error fetching developer projects:', error);
    throw new Error(`Failed to fetch developer projects: ${error.message}`);
  }
}

/**
 * Format projects section of the prompt
 * @param {Array} projects - Array of project objects
 * @returns {string} - Formatted projects section
 */
export function formatProjectsSection(projects) {
  if (!projects || projects.length === 0) {
    return '- No projects available';
  }
  
  // Extract and format project information
  return projects.map(project => {
    const technologies = project.tech?.map(t => t.S || t).join(', ') || 'Various technologies';
    return `- ${project.title}: ${technologies}`;
  }).join('\n');
}