# Visitor Context Edge Function

## Environment Variables

The function uses the following environment variable:

- `STAGE` - The deployment stage (dev, prod, staging) used to construct SSM parameter paths

## Test Events

Use the provided test event files in the AWS Lambda console:

1. **test-event-viewer-request.json** - Tests visitor parameter processing
2. **test-event-static-asset.json** - Tests static asset handling
3. **test-event-viewer-response.json** - Tests cookie setting

## SSM Parameters

The function fetches configuration from these SSM parameters:

- `/portfolio/{STAGE}/NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `/portfolio/{STAGE}/NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `/portfolio/{STAGE}/edge/visitor-table-name`

Where `{STAGE}` is replaced with the value of the `STAGE` environment variable.
