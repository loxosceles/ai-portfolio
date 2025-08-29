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

// Load all data tables
async function loadAllData() {
  for (const table of ['developer', 'projects', 'recruiters']) {
    await loadData(table);
  }
}

// Load specific data table
async function loadData(table) {
  try {
    const response = await fetch(`/api/${appState.currentEnv}/${table}`);
    const data = await response.json();

    if (table === 'developer') {
      appState.data[table] = Array.isArray(data) && data.length > 0 ? data[0] : data;
    } else {
      appState.data[table] = data;
    }

    renderData(table);
  } catch (error) {
    showError(`Failed to load ${table}: ${error.message}`);
  }
}

// Render data based on table
function renderData(table) {
  const container = document.getElementById(`${table}-list`);
  container.innerHTML = '';

  if (table === 'developer') {
    renderDeveloper(container);
  } else {
    if (appState.data[table].length === 0) {
      container.innerHTML = `<div class="empty-state">No ${table} found. Click "Add ${table.slice(0, -1)}" to create one.</div>`;
      return;
    }

    appState.data[table].forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'data-item';
      itemDiv.innerHTML = createItemHTML(table, item, index);
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

// Create HTML for different item tables
function createItemHTML(table, item, index) {
  if (table === 'projects') {
    return `
      <div class="item-header">
        <h4>${item.title || 'Unnamed Project'}</h4>
        <span class="status-badge">${item.status || 'Unknown'}</span>
      </div>
      <p><strong>Description:</strong> ${item.description || 'No description'}</p>
      <p><strong>Tech Stack:</strong> ${item.techStack?.join(', ') || 'None'}</p>
      <div class="item-actions">
        <button data-action="edit" data-table="${table}" data-index="${index}" class="edit-btn">Edit</button>
        <button data-action="delete" data-table="${table}" data-index="${index}" class="delete-btn">Delete</button>
      </div>
    `;
  } else if (table === 'recruiters') {
    return `
      <div class="item-header" style="${!item.active ? 'color: #999; opacity: 0.6;' : ''}">
        <h4>${item.recruiterName || 'Unnamed Recruiter'} - ${item.companyName || 'Unknown Company'}</h4>
        <button data-action="toggle-active" data-index="${index}" class="toggle-active-btn ${item.active ? 'active' : 'inactive'}">
          ${item.active ? 'Active' : 'Inactive'}
        </button>
      </div>
      <p style="${!item.active ? 'color: #999;' : ''}"><strong>Position:</strong> ${item.open_position || 'No position'}</p>
      <p style="${!item.active ? 'color: #999;' : ''}"><strong>Link ID:</strong> ${item.linkId || 'No link ID'}</p>
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
        <button data-action="edit" data-table="${table}" data-index="${index}" class="edit-btn" ${!item.active ? 'disabled' : ''}>Edit</button>
        <button data-action="delete" data-table="${table}" data-index="${index}" class="delete-btn" ${item.active ? 'disabled' : ''}>Delete</button>
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

// Create recruiter with Cognito user
async function createRecruiterWithUser(recruiterData) {
  try {
    showStatus(`Creating recruiter and Cognito user...`, 'loading');

    const response = await fetch(`/api/${appState.currentEnv}/recruiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recruiterData)
    });

    const result = await response.json();

    if (result.success) {
      // Update sync status
      appState.syncStatus = result.syncStatus;
      updateSyncStatusUI();

      showStatus('Recruiter and Cognito user created successfully', 'success');

      // Reload recruiters data
      await loadData('recruiters');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Recruiter creation failed: ${error.message}`, 'error');
  }
}

// Delete functions
async function deleteProject(index) {
  const project = appState.data.projects[index];
  if (!confirm(`Delete "${project.title}"?`)) return;

  try {
    const response = await fetch(`/api/${appState.currentEnv}/projects/${project.id}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      appState.data.projects.splice(index, 1);
      renderData('projects');
      updateSyncStatus(result.syncStatus);
      showStatus(`Deleted ${project.title}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Delete failed: ${error.message}`, 'error');
  }
}

async function deleteRecruiter(index) {
  const recruiter = appState.data.recruiters[index];
  if (!confirm(`Delete "${recruiter.recruiterName}"?`)) return;

  try {
    const response = await fetch(`/api/${appState.currentEnv}/recruiters/${recruiter.linkId}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      appState.data.recruiters.splice(index, 1);
      renderData('recruiters');
      updateSyncStatus(result.syncStatus);
      showStatus(`Deleted ${recruiter.recruiterName}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Delete failed: ${error.message}`, 'error');
  }
}

// Edit functions
function editProject(index) {
  const project = appState.data.projects[index];
  const formHTML = createProjectForm(project);
  showModal('Edit Project', formHTML, 'projects', index);
}

function editRecruiter(index) {
  const recruiter = appState.data.recruiters[index];
  const formHTML = createRecruiterForm(recruiter);
  showModal('Edit Recruiter', formHTML, 'recruiters', index);
}

// Toggle recruiter active status
async function toggleRecruiterActive(index) {
  const recruiter = appState.data.recruiters[index];
  const newActiveState = !recruiter.active;

  try {
    if (newActiveState === false) {
      // Deactivating - remove link first
      showStatus('Removing link and deactivating recruiter...', 'loading');

      const removeLinkResponse = await fetch(
        `/api/${appState.currentEnv}/links/remove/${recruiter.linkId}`,
        {
          method: 'POST'
        }
      );

      if (!removeLinkResponse.ok) {
        const removeResult = await removeLinkResponse.json();
        throw new Error(removeResult.error || 'Failed to remove link');
      }
    }

    // Update recruiter active status
    const response = await fetch(`/api/${appState.currentEnv}/recruiters/${recruiter.linkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recruiter, active: newActiveState })
    });
    const result = await response.json();

    if (result.success) {
      // Update local state - clear link data if deactivated
      appState.data.recruiters[index] = {
        ...recruiter,
        active: newActiveState,
        ...(newActiveState === false && { linkUrl: undefined, linkExpiry: undefined })
      };
      renderData('recruiters');
      updateSyncStatus(result.syncStatus);
      showStatus(`Recruiter ${newActiveState ? 'activated' : 'deactivated'}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Toggle failed: ${error.message}`, 'error');
  }
}

// Individual link generation
async function generateLinkForRecruiter(recruiterIndex) {
  const recruiter = appState.data.recruiters[recruiterIndex];

  showStatus(`Generating link for ${recruiter.recruiterName}...`, 'loading');

  try {
    const response = await fetch(`/api/${appState.currentEnv}/links/generate/${recruiter.linkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    <div id="skill-categories">
      ${(item.skillSets || [])
        .map(
          (skillSet, index) => `
        <div class="skill-category-group">
          <div class="category-header">
            <h4>Category ${index + 1}</h4>
            <button type="button" onclick="removeSkillCategory(${index})" class="remove-btn">Remove</button>
          </div>
          <div class="form-group">
            <label>Name:</label>
            <input type="text" id="form-category-${index}" value="${skillSet.name}" placeholder="Frontend">
          </div>
          <div class="form-group">
            <label>Skills (comma-separated):</label>
            <input type="text" id="form-skills-${index}" value="${skillSet.skills.join(', ')}" placeholder="React, JavaScript">
          </div>
        </div>
      `
        )
        .join('')}
      ${
        (item.skillSets || []).length === 0
          ? `
        <div class="skill-category-group">
          <div class="category-header">
            <h4>Category 1</h4>
          </div>
          <div class="form-group">
            <label>Name:</label>
            <input type="text" id="form-category-0" value="" placeholder="Frontend">
          </div>
          <div class="form-group">
            <label>Skills (comma-separated):</label>
            <input type="text" id="form-skills-0" value="" placeholder="React, JavaScript">
          </div>
        </div>
      `
          : ''
      }
    </div>
    <div class="form-group">
      <button type="button" onclick="addSkillCategory()">Add Category</button>
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
      <label>Slug (URL-friendly):</label>
      <input type="text" id="form-slug" value="${item.slug || ''}" placeholder="my-project">
    </div>
    <div class="form-group">
      <label>Icon:</label>
      <input type="text" id="form-icon" value="${item.icon || ''}" placeholder="🚀">
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
      <label>GitHub URL:</label>
      <input type="url" id="form-githuburl" value="${item.githubUrl || ''}" placeholder="https://github.com/user/repo">
    </div>
    <div class="form-group">
      <label>Overview:</label>
      <textarea id="form-overview" placeholder="Detailed project overview...">${item.overview || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Challenge:</label>
      <textarea id="form-challenge" placeholder="Main challenge addressed...">${item.challenge || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Solution:</label>
      <textarea id="form-solution" placeholder="Solution approach taken...">${item.solution || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Highlights (comma-separated):</label>
      <input type="text" id="form-highlights" value="${item.highlights?.join(', ') || ''}" placeholder="Key features, achievements">
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

    <div class="form-group">
      <label>Link Expiry:</label>
      <span class="readonly-field">${item.linkExpiry ? new Date(item.linkExpiry).toLocaleString() : 'Not set'}</span>
    </div>
    <div class="form-group">
      <label>Link URL:</label>
      <span class="readonly-field">${item.linkUrl || 'Not generated'}</span>
    </div>
  `;
}

// Modal management
let editingTable = null;
let editingIndex = null;

function showModal(title, content, table, index) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').style.display = 'block';

  editingTable = table;
  editingIndex = index;
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  editingTable = null;
  editingIndex = null;
}

// Save functions
async function saveDeveloper() {
  try {
    const skillSets = [];
    let index = 0;

    while (document.getElementById(`form-category-${index}`)) {
      const categoryName = document.getElementById(`form-category-${index}`).value.trim();
      const skillsValue = document.getElementById(`form-skills-${index}`).value.trim();

      if (categoryName && skillsValue) {
        skillSets.push({
          id: categoryName.toLowerCase().replace(/\s+/g, '-'),
          name: categoryName,
          skills: skillsValue
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s)
        });
      }
      index++;
    }

    const data = {
      id: document.getElementById('form-id').value,
      name: document.getElementById('form-name').value,
      title: document.getElementById('form-title').value,
      email: document.getElementById('form-email').value,
      bio: document.getElementById('form-bio').value,
      skillSets:
        skillSets.length > 0
          ? skillSets
          : [{ id: 'general', name: 'General', skills: ['To be updated'] }]
    };

    const response = await fetch(`/api/${appState.currentEnv}/developer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (result.success) {
      appState.data.developer = data;
      renderData('developer');
      updateSyncStatus(result.syncStatus);
      closeModal();
      showStatus('Developer saved', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

async function saveProject() {
  const data = {
    id: document.getElementById('form-id').value,
    title: document.getElementById('form-title').value,
    slug: document.getElementById('form-slug').value,
    icon: document.getElementById('form-icon').value,
    description: document.getElementById('form-description').value,
    status: document.getElementById('form-status').value,
    highlights: document
      .getElementById('form-highlights')
      .value.split(',')
      .map((s) => s.trim())
      .filter((s) => s),
    techStack: document
      .getElementById('form-techstack')
      .value.split(',')
      .map((s) => s.trim())
      .filter((s) => s),
    githubUrl: document.getElementById('form-githuburl').value,
    overview: document.getElementById('form-overview').value,
    challenge: document.getElementById('form-challenge').value,
    solution: document.getElementById('form-solution').value,
    architecture: [],
    technicalShowcases: [],
    archPatterns: [],
    performance: [],
    repositoryAndDevelopment: {},
    developerId: document.getElementById('form-developerid').value
  };

  const isNew =
    editingIndex >= appState.data.projects.length || !appState.data.projects[editingIndex]?.id;
  const method = isNew ? 'POST' : 'PUT';
  const url = isNew
    ? `/api/${appState.currentEnv}/projects`
    : `/api/${appState.currentEnv}/projects/${data.id}`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (result.success) {
      appState.data.projects[editingIndex] = data;
      renderData('projects');
      updateSyncStatus(result.syncStatus);
      closeModal();
      showStatus('Project saved', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

async function saveRecruiter() {
  const data = {
    linkId: document.getElementById('form-linkid').value,
    recruiterName: document.getElementById('form-recruitername').value,
    companyName: document.getElementById('form-companyname').value,
    open_position: document.getElementById('form-openposition').value,
    context: document.getElementById('form-context').value,
    skills: document
      .getElementById('form-skills')
      .value.split(',')
      .map((s) => s.trim())
      .filter((s) => s),
    active: appState.data.recruiters[editingIndex]?.active ?? true,
    // Preserve existing values, don't send empty strings
    ...(appState.data.recruiters[editingIndex]?.linkExpiry && {
      linkExpiry: appState.data.recruiters[editingIndex].linkExpiry
    }),
    ...(appState.data.recruiters[editingIndex]?.linkUrl && {
      linkUrl: appState.data.recruiters[editingIndex].linkUrl
    })
  };

  const isNew =
    editingIndex >= appState.data.recruiters.length ||
    !appState.data.recruiters[editingIndex]?.linkId;

  if (isNew) {
    closeModal();
    createRecruiterWithUser(data);
    return;
  }

  try {
    const response = await fetch(`/api/${appState.currentEnv}/recruiters/${data.linkId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (result.success) {
      appState.data.recruiters[editingIndex] = data;
      renderData('recruiters');
      updateSyncStatus(result.syncStatus);
      closeModal();
      showStatus('Recruiter saved', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showStatus(`Save failed: ${error.message}`, 'error');
  }
}

// Route to correct save function
function saveItem() {
  if (editingTable === 'developer') {
    saveDeveloper();
  } else if (editingTable === 'projects') {
    saveProject();
  } else if (editingTable === 'recruiters') {
    saveRecruiter();
  }
}

// Helper function
function updateSyncStatus(syncStatus) {
  if (syncStatus) {
    appState.syncStatus = syncStatus;
    updateSyncStatusUI();
  }
}

// Add skill category function
function addSkillCategory() {
  const container = document.getElementById('skill-categories');
  const existingCategories = container.querySelectorAll('[id^="form-category-"]');
  const nextIndex = existingCategories.length;

  const newCategoryHTML = `
    <div class="skill-category-group">
      <div class="category-header">
        <h4>Category ${nextIndex + 1}</h4>
        <button type="button" onclick="removeSkillCategory(${nextIndex})" class="remove-btn">Remove</button>
      </div>
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="form-category-${nextIndex}" value="" placeholder="Frontend">
      </div>
      <div class="form-group">
        <label>Skills (comma-separated):</label>
        <input type="text" id="form-skills-${nextIndex}" value="" placeholder="React, JavaScript">
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', newCategoryHTML);
}

// Remove skill category function
function removeSkillCategory(index) {
  const categoryGroup = document
    .getElementById(`form-category-${index}`)
    .closest('.skill-category-group');
  categoryGroup.remove();
}

// Load sync status
async function loadSyncStatus() {
  try {
    const response = await fetch(`/api/${appState.currentEnv}/sync-status`);
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
    const response = await fetch(`/api/${appState.currentEnv}/export-upload`, {
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
  const table = e.target.dataset.table;
  const index = parseInt(e.target.dataset.index);

  if (action === 'generate-link') {
    generateLinkForRecruiter(index);
  } else if (action === 'toggle-active') {
    toggleRecruiterActive(index);
  } else if (action === 'edit') {
    if (table === 'projects') {
      editProject(index);
    } else if (table === 'recruiters') {
      editRecruiter(index);
    }
  } else if (action === 'delete') {
    if (table === 'projects') {
      deleteProject(index);
    } else if (table === 'recruiters') {
      deleteRecruiter(index);
    }
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
