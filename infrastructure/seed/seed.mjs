import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { developers, projects } from './data/index.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Environment check
const environment = process.env.ENVIRONMENT;

if (!environment) {
  console.error('Error: ENVIRONMENT is not set');
  process.exit(1);
}

if (environment === 'prod') {
  console.error('Error: Cannot seed data in production environment');
  process.exit(1);
}

const args = process.argv.slice(2); // Skip node and script path
const forceFlag = args.includes('--force');

function validateData() {
  // Get all developer IDs
  const developerIds = developers.map(dev => dev.id);
  
  // Validate each project has a developerId that exists
  projects.forEach(project => {
    if (!project.developerId) {
      throw new Error(`Project ${project.id} is missing developerId`);
    }
    if (!developerIds.includes(project.developerId)) {
      throw new Error(`Project ${project.id} references non-existent developer ${project.developerId}`);
    }
  });

  // Validate skillSets structure
  developers.forEach(developer => {
    if (!Array.isArray(developer.skillSets)) {
      throw new Error(`Developer ${developer.id} skillSets must be an array`);
    }

    developer.skillSets.forEach((skillSet, index) => {
      // Check for required ID
      if (!skillSet.id) {
        throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing id`);
      }
      // Check for required name (previously category)
      if (!skillSet.name) {
        throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing name`);
      }
      // Check skills array
      if (!Array.isArray(skillSet.skills)) {
        throw new Error(`Developer ${developer.id} skillSet at index ${index} skills must be an array`);
      }
      if (skillSet.skills.length === 0) {
        throw new Error(`Developer ${developer.id} skillSet at index ${index} skills array is empty`);
      }
    });
  });
}


async function seedData() {

  // Validate data before seeding 
  validateData();

  try {
    // Seed developers
    await docClient.send(
      new BatchWriteCommand({
      RequestItems: {
        [`PortfolioDevelopers-${environment}`]: developers.map(dev => ({
        PutRequest: {
          Item: dev
        }
        }))
      }
      })
    );

    // Seed projects
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [`PortfolioProjects-${environment}`]: projects.map(proj => ({
            PutRequest: {
              Item: {
                ...proj,
                developerId: proj.developerId
              }
            }
          }))
        }
      })
    );

    console.log('Data seeding complete');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Allow force flag to be passed
const force = process.argv.includes('--force');

async function checkTablesEmpty(force = false) {
  const tables = [
    `PortfolioDevelopers-${environment}`,
    `PortfolioProjects-${environment}`
  ];

  try {
    for (const table of tables) {
      const data = await docClient.send(
        new ScanCommand({
          TableName: table,
          Limit: 1,
          Select: 'COUNT'
        })
      );

      if (data.Count > 0) {
        if (force) {
          console.warn(`⚠️ Table ${table} is not empty (${data.Count} items)`);
          console.warn('  --force flag detected, proceeding with overwrite');
        } else {
          console.error(`❌ Table ${table} is not empty (${data.Count} items)`);
          console.error('  Add --force flag to override existing data');
          process.exit(1);
        }
      } else {
        console.log(`✅ Table ${table} is empty`);
      }
    }
  } catch (error) {
    console.error('🚨 Error checking tables:', error.message);
    
    // Handle specific DynamoDB errors
    if (error.name === 'ResourceNotFoundException') {
      console.error('  Table does not exist - please deploy your infrastructure first');
    }
    
    process.exit(1);
  }
}

// Main execution
(async () => {
  await checkTablesEmpty(forceFlag);
  await seedData();
})();
