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

// Create environment-specific router
function createEnvironmentRouter(env) {
  const router = express.Router();

  // Sync status
  router.get('/sync-status', (req, res) => {
    res.json(syncState[env] || { isDirty: false, lastSync: null });
  });

  // Developer endpoints
  router.get('/developer', async (req, res) => {
    try {
      const items = await awsOps.getAllItems(env, 'developer');
      res.json(items[0] || {}); // Return single object for developer
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/developer', async (req, res) => {
    try {
      const data = req.body;

      // Validate data against schema
      const validationResult = await validateData('developer', data, env);

      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors
        });
      }

      await awsOps.updateItem(env, 'developer', data);

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Developer updated',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Projects endpoints
  router.get('/projects', async (req, res) => {
    try {
      const items = await awsOps.getAllItems(env, 'projects');
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/projects', async (req, res) => {
    try {
      const data = req.body;

      const validationResult = await validateData('projects', data, env);

      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors
        });
      }

      await awsOps.createItem(env, 'projects', data);

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Project created',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/projects/:id', async (req, res) => {
    try {
      const data = req.body;

      const validationResult = await validateData('projects', data, env);

      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors
        });
      }

      await awsOps.updateItem(env, 'projects', data);

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Project updated',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/projects/:id', async (req, res) => {
    try {
      await awsOps.deleteItem(env, 'projects', { id: req.params.id });

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Project deleted',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recruiters endpoints
  router.get('/recruiters', async (req, res) => {
    try {
      const items = await awsOps.getAllItems(env, 'recruiters');
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/recruiters', async (req, res) => {
    try {
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

      // 2. Create recruiter in DynamoDB
      await awsOps.createItem(env, 'recruiters', recruiterData);

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

  router.put('/recruiters/:linkId', async (req, res) => {
    try {
      const data = req.body;

      const validationResult = await validateData('recruiters', data, env);

      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.errors
        });
      }

      await awsOps.updateItem(env, 'recruiters', data);

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Recruiter updated',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/recruiters/:linkId', async (req, res) => {
    try {
      await awsOps.deleteItem(env, 'recruiters', { linkId: req.params.linkId });

      syncState[env].isDirty = true;
      await saveSyncState();

      res.json({
        success: true,
        message: 'Recruiter deleted',
        syncStatus: { isDirty: true }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Export and upload
  router.post('/export-upload', async (req, res) => {
    try {
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

  // Link generation
  router.post('/links/generate/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;

      // Invoke LinkGenerator Lambda
      const lambdaClient = new LambdaClient({
        region: ADMIN_CONFIG.regions.dynamodb
      });

      console.log(`Invoking Lambda: link-generator-${env} with linkId: ${linkId}`);

      const command = new InvokeCommand({
        FunctionName: `link-generator-${env}`,
        Payload: JSON.stringify({
          linkId,
          createRecruiterProfile: false
        })
      });

      const response = await lambdaClient.send(command);
      const lambdaResult = JSON.parse(new TextDecoder().decode(response.Payload));

      if (lambdaResult.statusCode === 200) {
        const body = JSON.parse(lambdaResult.body);

        const adminResult = {
          success: true,
          url: body.link,
          linkId: body.linkId,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          generatedAt: new Date().toISOString()
        };

        res.json(adminResult);
      } else {
        const errorBody = JSON.parse(lambdaResult.body);
        throw new Error(errorBody.error || 'Lambda execution failed');
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Link generation failed: ${error.message}`
      });
    }
  });

  // Link removal
  router.post('/links/remove/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;

      // Invoke LinkGenerator Lambda with remove action
      const lambdaClient = new LambdaClient({
        region: ADMIN_CONFIG.regions.dynamodb
      });

      console.log(`Invoking Lambda: link-generator-${env} with linkId: ${linkId} (remove action)`);

      const command = new InvokeCommand({
        FunctionName: `link-generator-${env}`,
        Payload: JSON.stringify({
          linkId,
          action: 'remove'
        })
      });

      const response = await lambdaClient.send(command);
      const lambdaResult = JSON.parse(new TextDecoder().decode(response.Payload));

      if (lambdaResult.statusCode === 200) {
        const body = JSON.parse(lambdaResult.body);

        const adminResult = {
          success: true,
          message: body.message || 'Link removed successfully',
          removedAt: new Date().toISOString()
        };

        res.json(adminResult);
      } else {
        const errorBody = JSON.parse(lambdaResult.body);
        throw new Error(errorBody.error || 'Lambda execution failed');
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Link removal failed: ${error.message}`
      });
    }
  });

  return router;
}

// Mount environment routers
app.use('/api/dev', createEnvironmentRouter('dev'));
app.use('/api/prod', createEnvironmentRouter('prod'));

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
