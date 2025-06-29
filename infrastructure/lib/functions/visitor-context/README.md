# Visitor Context Lambda@Edge Function

This directory contains environment-specific Lambda@Edge functions for handling visitor authentication and context.

## Structure

```
visitor-context/
├── README.md           # This documentation
├── dev/
│   ├── index.mjs      # Dev environment function
│   ├── package.json   # Dependencies
│   └── test-events/   # Test event files for development
└── prod/
    ├── index.mjs      # Production environment function
    └── package.json   # Dependencies
```

## Why Duplicate Files?

This structure exists due to **Lambda@Edge limitations**:

1. **No Environment Variables**: Lambda@Edge functions cannot use environment variables to determine their environment
2. **Header Issues**: CloudFront custom headers are set on origins, but Lambda@Edge runs before reaching the origin, so environment headers are not available to the function
3. **Environment Isolation**: Each environment needs its own function with hardcoded parameter paths for security and reliability

## Environment-Specific Configuration

Each environment has its own `index.mjs` with hardcoded SSM parameter paths:

- **Dev**: Uses `/portfolio/dev/*` parameter paths
- **Prod**: Uses `/portfolio/prod/*` parameter paths

## Deployment

The CDK stack automatically deploys the correct environment-specific function:

- Dev stack uses `visitor-context/dev/` directory
- Prod stack uses `visitor-context/prod/` directory

This ensures complete environment isolation with no cross-environment file pollution.
