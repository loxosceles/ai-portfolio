# GitHub Activity Preview Script

## Usage

1. Set environment variables:

```bash
export GITHUB_TOKEN="your_github_personal_access_token"
export GITHUB_USERNAME="your_github_username"  # optional, defaults to 'octocat'
```

2. Run the script:

```bash
node scripts/github-activity-preview.mjs
```

## What it fetches

- User profile data (repos, followers, etc.)
- Recent public events (last 90 days)
- Repository list with stats
- Daily activity counts
- Activity type breakdown

## Output

- Console summary of activity data
- JSON file with complete data: `github-activity-{username}-{date}.json`

## GitHub Token Setup

Create a personal access token at: https://github.com/settings/tokens
Required scopes: `public_repo`, `read:user`
