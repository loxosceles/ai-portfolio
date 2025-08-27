import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

import ADMIN_CONFIG from './lib/config.mjs';
import AWSOperations from './lib/aws-operations.mjs';
import { validateData } from './lib/validation.mjs';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static('public'));

const awsOps = new AWSOperations(ADMIN_CONFIG);

// Simple state tracking
let syncState = {
  dev: { isDirty: false, lastSync: null },
  prod: { isDirty: false, lastSync: null }
};

// Load state on startup
async function loadSyncState() {
  try {
    const stateFile = path.resolve(ADMIN_CONFIG.projectRoot, ADMIN_CONFIG.paths.stateFile);
    const data = await fs.readFile(stateFile, 'utf-8');
    syncState = JSON.parse(data);
  } catch {
    // Use default state if file doesn't exist
  }
}

async function saveSyncState() {
  const stateFile = path.resolve(ADMIN_CONFIG.projectRoot, ADMIN_CONFIG.paths.stateFile);
  // Ensure directory exists
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(syncState, null, 2));
}

// Get sync status
app.get('/api/sync-status/:env', (req, res) => {
  const { env } = req.params;
  res.json(syncState[env] || { isDirty: false, lastSync: null });
});

// DDB-direct data loading
app.get('/api/data/:env/:type', async (req, res) => {
  try {
    const { env, type } = req.params;

    if (!ADMIN_CONFIG.tables[type]) {
      return res.status(400).json({ error: `Unknown data type: ${type}` });
    }

    const items = await awsOps.getAllItems(env, type);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DDB-direct data saving with dirty state marking
app.post('/api/data/:env/:type', async (req, res) => {
  try {
    const { env, type } = req.params;
    const data = req.body;

    if (!ADMIN_CONFIG.tables[type]) {
      return res.status(400).json({ error: `Unknown data type: ${type}` });
    }

    // Validate data against schema
    try {
      const bucketName = await awsOps.getSSMParameter(env, 'DATA_BUCKET_NAME');
      const validationResult = await validateData(type, data, bucketName, ADMIN_CONFIG.regions.dynamodb);
      
      if (!validationResult.valid) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.errors 
        });
      }
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return res.status(500).json({ 
        error: 'Validation system error', 
        message: validationError.message 
      });
    }

    // Save to DynamoDB
    await awsOps.saveItems(env, type, data);

    // Mark as dirty
    syncState[env].isDirty = true;
    await saveSyncState();

    res.json({
      success: true,
      message: `${type} saved to DynamoDB`,
      syncStatus: { isDirty: true }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export and upload (clears dirty state)
app.post('/api/export-upload/:env', async (req, res) => {
  try {
    const { env } = req.params;

    // 1. Export DDB to JSON files
    const exportResults = await awsOps.exportToFiles(env);

    // 2. Upload to S3 using existing CLI
    await execAsync(`pnpm upload-static-data:${env}`, {
      cwd: path.join(__dirname, '..')
    });

    // 3. Clear dirty state
    syncState[env].isDirty = false;
    syncState[env].lastSync = new Date().toISOString();
    await saveSyncState();

    res.json({
      success: true,
      message: 'Export and upload completed',
      exportResults: exportResults,
      syncStatus: { isDirty: false, lastSync: syncState[env].lastSync }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create recruiter with Cognito user
app.post('/api/recruiters/create/:env', async (req, res) => {
  try {
    const { env } = req.params;
    const recruiterData = req.body;

    // Validate required fields
    if (!recruiterData.linkId || recruiterData.linkId === '') {
      return res.status(400).json({ error: 'Link ID is required' });
    }

    // 1. Create Cognito user
    const cognitoResult = await awsOps.createCognitoUser(
      env,
      recruiterData.linkId,
      ADMIN_CONFIG.cognito
    );
    if (!cognitoResult.success) {
      return res.status(500).json({
        error: `Failed to create Cognito user: ${cognitoResult.error}`
      });
    }

    // 2. Save recruiter to DynamoDB
    await awsOps.saveItems(env, 'recruiters', [recruiterData]);

    // 3. Mark as dirty
    syncState[env].isDirty = true;
    await saveSyncState();

    res.json({
      success: true,
      message: 'Recruiter and Cognito user created successfully',
      cognitoUser: {
        username: cognitoResult.username
      },
      syncStatus: { isDirty: true }
    });
  } catch (error) {
    console.error('Recruiter creation error:', error);
    res.status(500).json({
      success: false,
      error: `Recruiter creation failed: ${error.message}`
    });
  }
});

// Individual link generation
app.post('/api/links/generate/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const { env } = req.body;

    // Get current environment if not provided
    const currentEnv = env || 'dev';

    // Invoke LinkGenerator Lambda
    const lambdaClient = new LambdaClient({
      region: ADMIN_CONFIG.regions.dynamodb // eu-central-1
    });

    console.log(`Invoking Lambda: link-generator-${currentEnv} with recruiterId: ${recruiterId}`);

    const command = new InvokeCommand({
      FunctionName: `link-generator-${currentEnv}`,
      Payload: JSON.stringify({
        recruiterId,
        createRecruiterProfile: false // Don't create profile, use existing recruiter data
      })
    });

    const response = await lambdaClient.send(command);
    const lambdaResult = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Lambda response:', JSON.stringify(lambdaResult, null, 2));

    if (lambdaResult.statusCode === 200) {
      const body = JSON.parse(lambdaResult.body);

      console.log('Lambda body:', JSON.stringify(body, null, 2));

      // Map Lambda response to admin board format
      const adminResult = {
        success: true,
        url: body.link,
        linkId: body.linkId,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        generatedAt: new Date().toISOString()
      };

      res.json(adminResult);
    } else {
      const errorBody = JSON.parse(lambdaResult.body);
      console.error('Link generation error:', error);
      console.error('Lambda error response:', errorBody);
      throw new Error(errorBody.error || 'Lambda execution failed');
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Link generation failed: ${error.message}`
    });
  }
});

const PORT = 3001;

// Export the app for testing
export default app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Initialize state and start server
  loadSyncState()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 DDB-Direct Admin Interface: http://localhost:${PORT}`);
        console.log(`📊 Direct DynamoDB operations with sync status tracking`);
        console.log(`📁 Managing: developer, projects, recruiters`);
        console.log(`🔗 Link generation: Individual per recruiter`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize admin interface:', error);
      process.exit(1);
    });
}
