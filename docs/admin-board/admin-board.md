# Admin Board

## Overview

The Admin Board is a localhost web interface for managing portfolio data (developers, projects, recruiters) with integrated link generation functionality. Built as an Express.js application with vanilla JavaScript frontend.

### Why Localhost

1. **Quick Development**: Needed a local tool with potential for cloud migration
2. **Single User**: Only used by one admin (the developer) for a personal portfolio
3. **Avoid Manual Editing**: Prevents error-prone hand-editing of JSON files

## Architecture

### Technology Stack

- **Backend**: Express.js with ES modules
- **Frontend**: Vanilla JavaScript with modern event listeners
- **Data**: Direct DynamoDB integration via AWS SDK
- **Styling**: CSS Grid and Flexbox

### File Structure

```
infrastructure/admin/
├── server.js              # Express server with DynamoDB integration
├── package.json           # Dependencies and scripts
├── lib/                   # Backend utilities
│   ├── config.js         # Configuration following CLI patterns
│   └── aws-operations.js # DynamoDB operations wrapper
└── public/               # Frontend assets
    ├── index.html        # Three-tab interface
    ├── app.js           # Modern JavaScript with event delegation
    ├── style.css        # Responsive styling
    └── config.js        # Frontend configuration
```

## Features

### Three-Tab Interface

**Developers Tab**: Single developer profile management

- Fields: ID, name, title, email, bio
- Maps to `Portfolio-Developer-{stage}` table

**Projects Tab**: Project portfolio management

- Fields: ID, title, description, status, tech stack, developer ID
- Status options: Planned, Active, Completed
- Maps to `Portfolio-Projects-{stage}` table

**Recruiters Tab**: Recruiter profiles with link generation

- Fields: Link ID, name, company, position, context, skills
- Individual "Generate Link" buttons per recruiter
- Maps to `Portfolio-RecruiterProfiles-{stage}` table

### Modern JavaScript Implementation

**Event Delegation**: Uses `data-action` attributes instead of onclick handlers

```javascript
// Modern approach
<button data-action="generate-link" data-index="0">
  Generate Link
</button>;

// Event delegation
document.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'generate-link') {
    const index = parseInt(e.target.dataset.index);
    generateLinkForRecruiter(index);
  }
});
```

**Initialization Pattern**: Comprehensive DOMContentLoaded setup

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Static element listeners
  document.getElementById('environment').addEventListener('change', switchEnvironment);
  document.getElementById('add-project-btn').addEventListener('click', addProject);

  // Initialize app
  switchTab('developer');
  loadAllData();
  loadSyncStatus();
});
```

### Data Management

**Direct DynamoDB Integration**: Bypasses CLI for real-time operations

- Read operations: Scan tables for current environment
- Write operations: PutItem/UpdateItem with validation
- Environment switching: Dev/Prod table separation
- Sync status: Tracks changes and S3 export status

**Data Validation**: Ensures required fields before save

```javascript
// Developer validation
if (type === 'developer' && (!data.id || data.id === '')) {
  return res.status(400).json({ error: 'Developer ID is required' });
}

// Project validation
if (type === 'projects' && Array.isArray(data)) {
  for (const item of data) {
    if (!item.id || item.id === '') {
      return res.status(400).json({ error: 'Project ID is required for all projects' });
    }
  }
}
```

### Link Generation Service

Each recruiter has a "Generate Link" button that calls the LinkGenerator Lambda service:

**Service Integration**:

- Endpoint: `/api/links/generate/:recruiterId`
- Calls LinkGenerator Lambda with recruiter data
- Creates Cognito user and VisitorLinks table entry
- Returns personalized portfolio URL with 14-day expiration

**Current Status**: Mock implementation returns structured response. Lambda integration pending.

**Response Format**:

```javascript
{
  success: true,
  url: "https://portfolio.cloudfront.net/?visitor=jane-smith-techcorp-001",
  expiresAt: "2024-02-15T10:30:00Z",
  generatedAt: "2024-01-15T10:30:00Z"
}
```

## Technical Details

### JavaScript Implementation

Uses vanilla JavaScript with modern event listeners instead of TypeScript to enable direct cloud deployment without build steps.

**Event Delegation Pattern**:

```javascript
// Uses data attributes instead of onclick handlers
<button data-action="generate-link" data-index="0">
  Generate Link
</button>;

// Centralized event handling
document.addEventListener('click', (e) => {
  if (e.target.dataset.action === 'generate-link') {
    generateLinkForRecruiter(parseInt(e.target.dataset.index));
  }
});
```

### Data Operations

Direct DynamoDB integration via AWS SDK instead of CLI commands:

- Read: Scan operations on environment-specific tables
- Write: PutItem/UpdateItem with field validation
- Export: Uploads JSON files to S3 static data bucket

### Configuration Patterns

**Follows Infrastructure CLI Patterns**: Consistent with existing codebase

```javascript
// Reuses existing patterns from aws-config.ts
const ADMIN_CONFIG = {
  regions: {
    dynamodb: 'eu-central-1',
    ssm: 'eu-central-1'
  },
  dataTypes: {
    developer: {
      file: 'developer.json',
      ssmParam: 'DEVELOPER_TABLE_NAME',
      isSingle: true
    }
    // ... follows DATA_CONFIG pattern
  }
};
```

## Usage

### Starting the Admin Board

```bash
# From project root
pnpm admin:start

# Or with auto-reload for development
pnpm admin:dev
```

### Environment Switching

1. Use dropdown in header to switch between Dev/Prod
2. Data automatically loads from appropriate DynamoDB tables
3. Changes are environment-specific

### Data Management Workflow

1. **Edit Data**: Use forms in each tab to modify entries
2. **Save Changes**: Click "Save All Changes" to write to DynamoDB
3. **Export to S3**: Use "Export & Upload to S3" when ready to deploy
4. **Sync Status**: Visual indicator shows when changes need S3 sync

### Link Generation Workflow

1. **Add Recruiter**: Create recruiter profile in Recruiters tab
2. **Generate Link**: Click "Generate Link" button for individual recruiter
3. **View Status**: Link expiration date displayed after generation
4. **Regenerate**: Click button again to create new link when expired

## Integration Points

### AWS Services

**DynamoDB Tables**:

- `Portfolio-Developer-{stage}`: Single developer profile
- `Portfolio-Projects-{stage}`: Project portfolio entries
- `Portfolio-RecruiterProfiles-{stage}`: Recruiter data for link generation

**S3 Integration**: Export functionality uploads JSON files to static data bucket

**SSM Parameters**: Reads table names following existing parameter patterns

### LinkGenerator Lambda

**Ready for Integration**: Mock link generation designed for easy Lambda connection

- Endpoint: `/api/links/generate/:recruiterId`
- Payload: `{ env, recruiter }`
- Response: `{ success, url, expiresAt, generatedAt }`

### Existing CLI Infrastructure

**Reuses Patterns**: Configuration and AWS operations follow established patterns

- Table name resolution via SSM
- Environment management
- AWS SDK client configuration
- Error handling and validation

## Next Steps

### Lambda Integration

Connect "Generate Link" buttons to actual LinkGenerator Lambda service.

### Optional Cloud Deployment

If multi-user access needed:

- Deploy frontend to S3/CloudFront
- Add Cognito authentication
- Convert backend operations to Lambda functions

## Related Documentation

- [Link Generator Migration Plan](../planning/link-generator-migration.md)
- [Infrastructure Overview](../README.md)
- [Development Workflow](../guides/development-workflow.md)
