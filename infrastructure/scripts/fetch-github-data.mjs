#!/usr/bin/env node

// Load .env file
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envFile = readFileSync(join(__dirname, '../../.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/["']/g, '');
    }
  });
} catch (e) {
  // .env file not found, continue with system env vars
}

const GITHUB_TOKEN = process.env.GITHUB_PANEL_TOKEN || process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'octocat';

if (!GITHUB_TOKEN) {
  console.error('GITHUB_PANEL_TOKEN environment variable is required');
  console.error('Add it to .env file: GITHUB_PANEL_TOKEN="your_token_here"');
  process.exit(1);
}

console.log(`Token set: ${GITHUB_TOKEN.substring(0, 4)}...${GITHUB_TOKEN.substring(GITHUB_TOKEN.length - 4)}`);

async function fetchGitHubData(url) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Activity-Preview'
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}\nResponse: ${errorBody}`);
  }
  
  return response.json();
}

async function fetchGraphQLData(query) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GitHub-Activity-Preview'
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}\nResponse: ${errorBody}`);
  }
  
  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
  
  return result.data;
}

async function getGitHubActivity() {
  try {
    console.log(`Fetching GitHub activity for: ${GITHUB_USERNAME}`);
    
    // Fetch user profile
    const user = await fetchGitHubData(`https://api.github.com/users/${GITHUB_USERNAME}`);
    
    // Calculate date range for last 13 weeks
    const today = new Date();
    const startDate = new Date(today.getTime() - 91 * 24 * 60 * 60 * 1000);
    const fromDate = startDate.toISOString();
    const toDate = today.toISOString();
    
    // Fetch contribution data using GraphQL API
    const contributionQuery = `
      query {
        user(login: "${GITHUB_USERNAME}") {
          contributionsCollection(from: "${fromDate}", to: "${toDate}") {
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }
    `;
    
    const contributionData = await fetchGraphQLData(contributionQuery);
    const contributionDays = contributionData.user.contributionsCollection.contributionCalendar.weeks
      .flatMap(week => week.contributionDays);
    
    // Fetch recent events for activity types
    const events = await fetchGitHubData(`https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`);
    
    // Fetch repositories
    const repos = await fetchGitHubData(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=50`);
    
    // Process activity types from events
    const activityTypes = {};
    const dailyActivity = {};
    
    events.forEach(event => {
      const date = event.created_at.split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
      activityTypes[event.type] = (activityTypes[event.type] || 0) + 1;
    });
    
    // Generate contribution grid from GraphQL data
    const contributionGrid = {};
    
    contributionDays.forEach(day => {
      const commits = day.contributionCount;
      
      // Calculate intensity level (0-4 like GitHub)
      let level = 0;
      if (commits > 0) level = 1;
      if (commits >= 3) level = 2;
      if (commits >= 6) level = 3;
      if (commits >= 10) level = 4;
      
      contributionGrid[day.date] = {
        date: day.date,
        count: commits,
        level: level
      };
    });
    
    // Calculate recent activity metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(event => new Date(event.created_at) > thirtyDaysAgo);
    
    const result = {
      user: {
        login: user.login,
        name: user.name,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at
      },
      activity: {
        totalEvents: events.length,
        recentEvents: recentEvents.length,
        dailyActivity,
        totalContributions: contributionDays.reduce((sum, day) => sum + day.contributionCount, 0),
        activityTypes,
        lastEventDate: events[0]?.created_at
      },
      contributionGraph: contributionGrid,
      repositories: repos.slice(0, 10).map(repo => ({
        name: repo.name,
        stargazers_count: repo.stargazers_count,
        language: repo.language,
        updated_at: repo.updated_at,
        size: repo.size
      }))
    };
    
    console.log('\n=== GitHub Activity Preview ===');
    console.log(`User: ${result.user.name} (@${result.user.login})`);
    console.log(`Public Repos: ${result.user.public_repos}`);
    console.log(`Followers: ${result.user.followers}`);
    console.log(`Total Events (90 days): ${result.activity.totalEvents}`);
    console.log(`Recent Events (30 days): ${result.activity.recentEvents}`);
    console.log(`Total Contributions (13 weeks): ${result.activity.totalContributions}`);
    console.log(`Last Activity: ${result.activity.lastEventDate}`);
    
    console.log('\nActivity Types:');
    Object.entries(result.activity.activityTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\nTop Repositories:');
    result.repositories.forEach(repo => {
      console.log(`  ${repo.name} (${repo.language || 'N/A'}) - ${repo.stargazers_count} stars`);
    });
    
    console.log('\nDaily Contributions (last 14 days):');
    const recentContributions = contributionDays.slice(-14);
    recentContributions.forEach(day => {
      if (day.contributionCount > 0) {
        console.log(`  ${day.date}: ${day.contributionCount} contributions`);
      }
    });
    
    console.log('\nContribution Graph Summary:');
    const levels = [0, 1, 2, 3, 4];
    levels.forEach(level => {
      const count = Object.values(result.contributionGraph).filter(day => day.level === level).length;
      console.log(`  Level ${level}: ${count} days`);
    });
    
    // Save to infrastructure data directory
    const outputPath = join(__dirname, '../data/dev/github-activity-data.json');
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nData saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    process.exit(1);
  }
}

getGitHubActivity();