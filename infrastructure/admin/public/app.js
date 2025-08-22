// Enhanced state management for all data types
let appState = {
  data: {
    developer: {},
    projects: [],
    recruiters: []
  },
  currentEnv: 'dev',
  currentTab: 'developer',
  syncStatus: { isDirty: false, lastSync: null }
};

// Environment switching
function switchEnvironment() {
  const envSelect = document.getElementById('environment');
  appState.currentEnv = envSelect.value;
  updateEnvBadge();
  loadAllData();
  loadSyncStatus();
  showStatus(`Switched to ${appState.currentEnv.toUpperCase()} environment`, 'success');
}

function updateEnvBadge() {
  const badge = document.getElementById('env-badge');
  badge.textContent = appState.currentEnv.toUpperCase();
  badge.className = `env-badge ${appState.currentEnv}`;

  // Show production warning
  if (appState.currentEnv === 'prod') {
    badge.textContent += ' (READ-ONLY)';
  }
}

// Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  appState.currentTab = tabName;
  loadData(tabName);
}

// Load all data types
async function loadAllData() {
  for (const type of ['developer', 'projects', 'recruiters']) {
    await loadData(type);
  }
}

// Load specific data type
async function loadData(type) {
  try {
    const response = await fetch(`/api/data/${appState.currentEnv}/${type}`);
    const data = await response.json();

    if (type === 'developer') {
      appState.data[type] = Array.isArray(data) && data.length > 0 ? data[0] : data;
    } else {
      appState.data[type] = data;
    }

    renderData(type);
  } catch (error) {
    showError(`Failed to load ${type}: ${error.message}`);
  }
}

// Render data based on type
function renderData(type) {
  const container = document.getElementById(`${type}-list`);
  container.innerHTML = '';

  if (type === 'developer') {
    renderDeveloper(container);
  } else {
    if (appState.data[type].length === 0) {
      container.innerHTML = `<div class="empty-state">No ${type} found. Click "Add ${type.slice(0, -1)}" to create one.</div>`;
      return;
    }

    appState.data[type].forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'data-item';
      itemDiv.innerHTML = createItemHTML(type, item, index);
      container.appendChild(itemDiv);
    });
  }
}

// Render single developer
function renderDeveloper(container) {
  const developer = appState.data.developer;

  if (!developer || !developer.id) {
    container.innerHTML = '<div class="empty-state">No developer profile found.</div>';
    return;
  }

  const itemDiv = document.createElement('div');
  itemDiv.className = 'data-item';
  itemDiv.innerHTML = `
    <div class="item-header">
      <h4>${developer.name || 'Unnamed Developer'}</h4>
      <span class="item-id">#${developer.id}</span>
    </div>
    <p><strong>Title:</strong> ${developer.title || 'No title'}</p>
    <p><strong>Email:</strong> ${developer.email || 'No email'}</p>
    <p><strong>Bio:</strong> ${developer.bio || 'No bio'}</p>
    <div class="item-actions">
      <button data-action="edit-developer" class="edit-btn">Edit</button>
    </div>
  `;
  container.appendChild(itemDiv);
}

// Create HTML for different item types
function createItemHTML(type, item, index) {
  if (type === 'projects') {
    return `
      <div class="item-header">
        <h4>${item.title || 'Unnamed Project'}</h4>
        <span class="status-badge">${item.status || 'Unknown'}</span>
      </div>
      <p><strong>Description:</strong> ${item.description || 'No description'}</p>
      <p><strong>Tech Stack:</strong> ${item.techStack?.join(', ') || 'None'}</p>
      <div class="item-actions">
        <button data-action="edit" data-type="${type}" data-index="${index}" class="edit-btn">Edit</button>
        <button data-action="delete" data-type="${type}" data-index="${index}" class="delete-btn">Delete</button>
      </div>
    `;
  } else if (type === 'recruiters') {
    return `
      <div class="item-header">
        <h4>${item.recruiterName || 'Unnamed Recruiter'} - ${item.companyName || 'Unknown Company'}</h4>
      </div>
      <p><strong>Position:</strong> ${item.open_position || 'No position'}</p>
      <p><strong>Link ID:</strong> ${item.linkId || 'No link ID'}</p>
      <div class="link-section">
        <div class="link-status">
          ${item.linkUrl ? `<a href="${item.linkUrl}" target="_blank">${item.linkUrl}</a>` : 'No active link'}
          ${item.linkExpiry ? `<br>Expires: ${new Date(item.linkExpiry).toLocaleDateString()}` : ''}
        </div>
        <button data-action="generate-link" data-index="${index}" class="generate-link-btn">
          Generate Link
        </button>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-type="${type}" data-index="${index}" class="edit-btn">Edit</button>
        <button data-action="delete" data-type="${type}" data-index="${index}" class="delete-btn">Delete</button>
      </div>
    `;
  }
}

// CRUD Operations
function editDeveloper() {
  const developer = appState.data.developer;
  const formHTML = createDeveloperForm(developer);
  showModal('Edit Developer Profile', formHTML, 'developer', 0);
}

function addProject() {
  const newProject = {
    id: `proj-${Date.now()}`,
    title: '',
    description: '',
    status: 'Planned',
    techStack: [],
    developerId: ''
  };
  appState.data.projects.push(newProject);
  renderData('projects');
  editItem('projects', appState.data.projects.length - 1);
}

function addRecruiter() {
  const newRecruiter = {
    linkId: '',
    recruiterName: '',
    companyName: '',
    open_position: '',
    context: '',
    skills: [],
    active: true,
    createdAt: new Date().toISOString()
  };
  appState.data.recruiters.push(newRecruiter);
  renderData('recruiters');
  editItem('recruiters', appState.data.recruiters.length - 1);
}

function editItem(type, index) {
  const item = appState.data[type][index];
  let formHTML = '';

  if (type === 'projects') {
    formHTML = createProjectForm(item);
  } else if (type === 'recruiters') {
    formHTML = createRecruiterForm(item);
  }

  showModal(`Edit ${type.slice(0, -1)}`, formHTML, type, index);
}

function deleteItem(type, index) {
  const item = appState.data[type][index];
  const name = item.name || item.title || item.recruiterName;

  if (confirm(`Delete "${name}"?`)) {
    appState.data[type].splice(index, 1);
    renderData(type);
    showStatus(`Deleted ${name}`, 'success');
  }
}

// Individual link generation
async function generateLinkForRecruiter(recruiterIndex) {
  const recruiter = appState.data.recruiters[recruiterIndex];

  showStatus(`Generating link for ${recruiter.recruiterName}...`, 'loading');

  try {
    const response = await fetch(`/api/links/generate/${recruiter.linkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        env: appState.currentEnv,
        recruiter: recruiter
      })
    });

    const result = await response.json();

    if (result.success) {
      appState.data.recruiters[recruiterIndex].linkUrl = result.url;
      appState.data.recruiters[recruiterIndex].linkExpiry = result.expiresAt;

      renderData('recruiters');
      showStatus(`Link generated for ${recruiter.recruiterName}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Link generation failed: ${error.message}`, 'error');
  }
}

// Form creators
function createDeveloperForm(item = {}) {
  return `
    <div class="form-group">
      <label>ID:</label>
      <input type="text" id="form-id" value="${item.id || ''}" placeholder="DEVELOPER_PROFILE">
    </div>
    <div class="form-group">
      <label>Name:</label>
      <input type="text" id="form-name" value="${item.name || ''}" placeholder="John Doe">
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" id="form-title" value="${item.title || ''}" placeholder="Senior Developer">
    </div>
    <div class="form-group">
      <label>Email:</label>
      <input type="email" id="form-email" value="${item.email || ''}" placeholder="john@example.com">
    </div>
    <div class="form-group">
      <label>Bio:</label>
      <textarea id="form-bio" placeholder="Brief description...">${item.bio || ''}</textarea>
    </div>
  `;
}

function createProjectForm(item = {}) {
  return `
    <div class="form-group">
      <label>ID:</label>
      <input type="text" id="form-id" value="${item.id || ''}" placeholder="proj-001">
    </div>
    <div class="form-group">
      <label>Title:</label>
      <input type="text" id="form-title" value="${item.title || ''}" placeholder="Project Name">
    </div>
    <div class="form-group">
      <label>Description:</label>
      <textarea id="form-description" placeholder="Project description...">${item.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Status:</label>
      <select id="form-status">
        <option value="Planned" ${item.status === 'Planned' ? 'selected' : ''}>Planned</option>
        <option value="Active" ${item.status === 'Active' ? 'selected' : ''}>Active</option>
        <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tech Stack (comma-separated):</label>
      <input type="text" id="form-techstack" value="${item.techStack?.join(', ') || ''}" placeholder="React, Node.js, AWS">
    </div>
    <div class="form-group">
      <label>Developer ID:</label>
      <input type="text" id="form-developerid" value="${item.developerId || ''}" placeholder="DEVELOPER_PROFILE">
    </div>
  `;
}

function createRecruiterForm(item = {}) {
  return `
    <div class="form-group">
      <label>Link ID:</label>
      <input type="text" id="form-linkid" value="${item.linkId || ''}" placeholder="jane-smith-techcorp-001">
    </div>
    <div class="form-group">
      <label>Recruiter Name:</label>
      <input type="text" id="form-recruitername" value="${item.recruiterName || ''}" placeholder="Jane Smith">
    </div>
    <div class="form-group">
      <label>Company Name:</label>
      <input type="text" id="form-companyname" value="${item.companyName || ''}" placeholder="TechCorp">
    </div>
    <div class="form-group">
      <label>Open Position:</label>
      <input type="text" id="form-openposition" value="${item.open_position || ''}" placeholder="Senior Developer">
    </div>
    <div class="form-group">
      <label>Context:</label>
      <input type="text" id="form-context" value="${item.context || ''}" placeholder="Remote-first company">
    </div>
    <div class="form-group">
      <label>Skills (comma-separated):</label>
      <input type="text" id="form-skills" value="${item.skills?.join(', ') || ''}" placeholder="AWS, React, Node.js">
    </div>
  `;
}

// Modal management
let editingType = null;
let editingIndex = null;

function showModal(title, content, type, index) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').style.display = 'block';

  editingType = type;
  editingIndex = index;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  editingType = null;
  editingIndex = null;
}

function saveItem() {
  if (!editingType) return;

  if (editingType === 'developer') {
    // Update existing developer template, preserving all fields
    appState.data.developer.id = document.getElementById('form-id').value;
    appState.data.developer.name = document.getElementById('form-name').value;
    appState.data.developer.title = document.getElementById('form-title').value;
    appState.data.developer.email = document.getElementById('form-email').value;
    appState.data.developer.bio = document.getElementById('form-bio').value;
  } else if (editingType === 'projects') {
    // Update existing project template, preserving all fields
    const project = appState.data[editingType][editingIndex];
    project.id = document.getElementById('form-id').value;
    project.title = document.getElementById('form-title').value;
    project.description = document.getElementById('form-description').value;
    project.status = document.getElementById('form-status').value;
    project.techStack = document
      .getElementById('form-techstack')
      .value.split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    project.developerId = document.getElementById('form-developerid').value;
  } else if (editingType === 'recruiters') {
    // Update existing recruiter template, preserving all fields
    const recruiter = appState.data[editingType][editingIndex];
    recruiter.linkId = document.getElementById('form-linkid').value;
    recruiter.recruiterName = document.getElementById('form-recruitername').value;
    recruiter.companyName = document.getElementById('form-companyname').value;
    recruiter.open_position = document.getElementById('form-openposition').value;
    recruiter.context = document.getElementById('form-context').value;
    recruiter.skills = document
      .getElementById('form-skills')
      .value.split(',')
      .map((s) => s.trim())
      .filter((s) => s);
    if (!recruiter.createdAt) {
      recruiter.createdAt = new Date().toISOString();
    }
  }

  renderData(editingType);
  closeModal();

  const itemTypeName = editingType ? editingType.slice(0, -1) : 'item';
  showStatus(`${itemTypeName} updated. Use 'Save All Changes' to save to database.`, 'success');
}

// Save operations
async function saveAllData() {
  showStatus('Saving all data to DynamoDB...', 'loading');

  try {
    for (const [type, data] of Object.entries(appState.data)) {
      // Validate required fields before saving
      if (type === 'developer' && (!data.id || data.id === '')) {
        showStatus('Developer ID is required', 'error');
        return;
      }

      if (type === 'projects') {
        for (const project of data) {
          if (!project.id || project.id === '') {
            showStatus('All projects must have an ID', 'error');
            return;
          }
        }
      }

      if (type === 'recruiters') {
        for (const recruiter of data) {
          if (!recruiter.linkId || recruiter.linkId === '') {
            showStatus('All recruiters must have a Link ID', 'error');
            return;
          }
        }
      }

      const response = await fetch(`/api/data/${appState.currentEnv}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
    }

    // Mark as dirty after successful save
    appState.syncStatus.isDirty = true;
    updateSyncStatusUI();

    showStatus('All data saved to DynamoDB successfully', 'success');
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

// Load sync status
async function loadSyncStatus() {
  try {
    const response = await fetch(`/api/sync-status/${appState.currentEnv}`);
    appState.syncStatus = await response.json();
    updateSyncStatusUI();
  } catch (error) {
    console.error('Failed to load sync status:', error);
  }
}

// Update sync status UI
function updateSyncStatusUI() {
  const indicator = document.getElementById('sync-indicator');
  const button = document.getElementById('export-upload-btn');

  if (appState.syncStatus.isDirty) {
    indicator.innerHTML = '⚠️ Changes not backed up to S3';
    indicator.className = 'sync-status dirty';
    button.disabled = false;
    button.textContent = 'Export & Upload to S3';
  } else {
    const lastSync = appState.syncStatus.lastSync
      ? new Date(appState.syncStatus.lastSync).toLocaleString()
      : 'Never';
    indicator.innerHTML = `✅ Synced to S3 (${lastSync})`;
    indicator.className = 'sync-status clean';
    button.disabled = true;
    button.textContent = 'Up to date';
  }
}

// Export and upload integration
async function exportAndUpload() {
  showStatus('Exporting DDB data and uploading to S3...', 'loading');

  try {
    const response = await fetch(`/api/export-upload/${appState.currentEnv}`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      appState.syncStatus = result.syncStatus;
      updateSyncStatusUI();
      showStatus('Export and upload completed successfully', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Export failed: ${error.message}`, 'error');
  }
}

// Utility functions
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
}

function showError(message) {
  showStatus(message, 'error');
}

// Event delegation for dynamically generated buttons
document.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  const type = e.target.dataset.type;
  const index = parseInt(e.target.dataset.index);

  if (action === 'generate-link') {
    generateLinkForRecruiter(index);
  } else if (action === 'edit') {
    editItem(type, index);
  } else if (action === 'delete') {
    deleteItem(type, index);
  } else if (action === 'edit-developer') {
    editDeveloper();
  }
});

// Initialize event listeners for static elements
document.addEventListener('DOMContentLoaded', () => {
  // Environment selector
  document.getElementById('environment').addEventListener('change', switchEnvironment);

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Add buttons
  document.getElementById('add-project-btn').addEventListener('click', addProject);
  document.getElementById('add-recruiter-btn').addEventListener('click', addRecruiter);

  // Action buttons
  document.getElementById('export-upload-btn').addEventListener('click', exportAndUpload);
  document.getElementById('save-all-btn').addEventListener('click', saveAllData);

  // Modal buttons
  document.querySelector('.close').addEventListener('click', closeModal);
  document.getElementById('modal-save-btn').addEventListener('click', saveItem);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

  // Initialize app
  switchTab('developer');
  loadAllData();
  loadSyncStatus();
});

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    closeModal();
  }
};
