#!/usr/bin/env node
const { execSync } = require('child_process');

const environment = process.env.ENVIRONMENT || 'dev';

function run(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

function main() {
  console.log(`🚀 Starting deployment for environment: ${environment}\n`);

  // 1. Deploy infrastructure
  run('pnpm deploy:infra', 'Infrastructure deployment');

  // 2. Update local environment files
  run('pnpm postdeploy', 'Environment variables update');

  // 3. Deploy frontend with fresh env vars
  run('pnpm deploy:frontend', 'Frontend deployment');

  // 4. Seed data (only in development environments)
  if (environment === 'dev') {
    run('pnpm seed:infra', 'Developer and project data seeding');
    run('pnpm seed:job-matching', 'Job matching data seeding');
  } else {
    console.log('\n⏭️ Skipping data seeding in non-development environment');
  }

  // 5. Invalidate CloudFront cache
  const distributionId = execSync(
    `aws ssm get-parameter --name "/portfolio/${environment}/WEB_CLOUDFRONT_DISTRIBUTION_ID" --region us-east-1 --query 'Parameter.Value' --output text`,
    { encoding: 'utf-8' }
  ).trim();
  run(
    `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*" --region us-east-1`,
    'CloudFront cache invalidation'
  );

  console.log('\n🎉 Deployment completed successfully!');

  // Show deployment info
  const domain = execSync(
    `aws ssm get-parameter --name "/portfolio/${environment}/WEB_CLOUDFRONT_DOMAIN" --region us-east-1 --query 'Parameter.Value' --output text`,
    { encoding: 'utf-8' }
  ).trim();
  console.log(`\n📍 Website: https://${domain}`);
}

if (require.main === module) {
  main();
}
