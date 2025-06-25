# Deployment Guide

## Quick Deploy (Recommended)

```bash
# Deploy everything in correct order
ENVIRONMENT=dev pnpm deploy
```

This single command:

1. ✅ Deploys infrastructure (API + Shared + Web stacks)
2. ✅ Updates local environment files from SSM
3. ✅ Builds and deploys frontend with correct env vars
4. ✅ Invalidates CloudFront cache
5. ✅ Shows deployment URL

## Manual Steps (if needed)

```bash
# 1. Deploy infrastructure only
pnpm deploy:infra

# 2. Update environment files only
pnpm postdeploy

# 3. Deploy frontend only
pnpm deploy:frontend
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
