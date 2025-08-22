const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DATA_PATH = '../data';

// Template storage for clean JSON structure
let dataTemplates = {
  dev: { developer: null, projects: null, recruiters: null },
  prod: { developer: null, projects: null, recruiters: null }
};

// Load templates on startup
async function loadTemplates() {
  for (const env of ['dev', 'prod']) {
    for (const type of ['developer', 'projects', 'recruiters']) {
      try {
        const filePath = path.join(__dirname, DATA_PATH, env, `${type}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        dataTemplates[env][type] = JSON.parse(data);
      } catch (error) {
        dataTemplates[env][type] = type === 'developer' ? {} : [];
      }
    }
  }
}

// Load data from templates
app.get('/api/data/:env/:type', async (req, res) => {
  try {
    const { env, type } = req.params;

    // Return deep copy of template to prevent mutation
    const template = dataTemplates[env][type];
    res.json(JSON.parse(JSON.stringify(template)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save data to JSON files using clean templates
app.post('/api/data/:env/:type', async (req, res) => {
  try {
    const { env, type } = req.params;

    // PRODUCTION WRITE PROTECTION
    if (env === 'prod') {
      return res.status(403).json({
        success: false,
        error: 'Production data is write-protected. Use dev environment for testing.'
      });
    }

    // Update template with new data
    dataTemplates[env][type] = req.body;

    // Write clean JSON to file
    const dataDir = path.join(__dirname, DATA_PATH, env);
    const filePath = path.join(dataDir, `${type}.json`);

    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2) + '\n');

    res.json({ success: true, message: `${type} data saved` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute real CLI commands
app.post('/api/cli/:command', async (req, res) => {
  const { command } = req.params;
  const { env } = req.body;

  // PRODUCTION WRITE PROTECTION
  if (env === 'prod' && ['upload', 'sync'].includes(command)) {
    return res.status(403).json({
      success: false,
      error: 'Production operations are restricted. Use dev environment for testing.'
    });
  }

  try {
    if (command === 'upload') {
      const { stdout } = await execAsync(`pnpm upload-static-data:${env}`, {
        cwd: path.join(__dirname, '..')
      });

      res.json({
        success: true,
        output: stdout || 'Upload completed successfully',
        details: `Executed: pnpm upload-static-data:${env}`
      });
    } else if (command === 'sync') {
      // Run both upload and DynamoDB sync sequentially
      const upload = await execAsync(`pnpm upload-static-data:${env}`, {
        cwd: path.join(__dirname, '..')
      });

      const sync = await execAsync(`pnpm populate-static-data-ddb:${env}`, {
        cwd: path.join(__dirname, '..')
      });

      res.json({
        success: true,
        output: `Upload: ${upload.stdout}\n\nSync: ${sync.stdout}`,
        details: `Executed: upload + populate DynamoDB for ${env}`
      });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid command' });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: `Failed: ${command} for ${env}`
    });
  }
});

// Individual link generation
app.post('/api/links/generate/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;
    const { env, recruiter } = req.body;

    // Mock link generation - replace with actual Lambda call
    const mockResult = {
      success: true,
      url: `https://d2u34o1q6b8a3t.cloudfront.net/?visitor=${recruiterId}`,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      generatedAt: new Date().toISOString()
    };

    res.json(mockResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Link generation failed: ${error.message}`
    });
  }
});

const PORT = 3001;

// Initialize templates and start server
loadTemplates()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Admin Interface: http://localhost:${PORT}`);
      console.log(`📁 Managing: developer, projects, recruiters`);
      console.log(`🔗 Link generation: Individual per recruiter`);
      console.log(`🛡️  Production data is write-protected`);
      console.log(`📋 Templates loaded for dev and prod environments`);
    });
  })
  .catch((error) => {
    console.error('Failed to load templates:', error);
    process.exit(1);
  });
