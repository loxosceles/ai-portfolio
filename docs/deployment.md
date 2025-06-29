# Deployment Guide

## Quick Deploy (Recommended)

```bash
# Deploy to development environment
pnpm deploy:dev

# Deploy to production environment
pnpm deploy:prod
```

These commands:

1. ✅ Set up data in S3 buckets
2. ✅ Deploy infrastructure (API + Shared + Web stacks)
3. ✅ Update local environment files from SSM
4. ✅ Build and deploy frontend with correct env vars
5. ✅ Seed data (dev environment only)
6. ✅ Invalidate CloudFront cache
7. ✅ Show deployment URL

## Component Deployment (if needed)

```bash
# 1. Set up data in S3 buckets
pnpm run setup:data:dev  # or setup:data:prod

# 2. Deploy infrastructure only
pnpm run deploy:infra:dev  # or deploy:infra:prod

# 3. Update environment files only
pnpm run update:env:dev  # or update:env:prod

# 4. Deploy frontend only
pnpm run deploy:frontend:dev  # or deploy:frontend:prod
```

## Environment Variables

- **Local development**: `frontend/.env.local` (auto-updated)
- **Link generator**: `link-generator/.env` (auto-updated)
- **Deployed frontend**: Fetched from SSM during build

## Regions

- **Main app** (API/Cognito): `eu-central-1`
- **Web stack** (S3/CloudFront/Edge): `us-east-1`

## Troubleshooting

- **Old GraphQL URL**: Run `pnpm deploy` to rebuild with fresh env vars
- **Cache issues**: CloudFront invalidation is automatic
- **Missing env vars**: Check SSM parameters in correct regions
