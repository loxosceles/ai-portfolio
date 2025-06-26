# Security Policy

This document outlines the security considerations and measures implemented in the AI Portfolio Frontend application.

## Architecture Overview

The application uses a serverless architecture with the following components:

- **Frontend**: Static Next.js application hosted on AWS S3 and served via CloudFront
- **Authentication**: AWS Cognito for user authentication and temporary visitor access
- **API**: AppSync GraphQL API and API Gateway REST endpoints
- **Edge Functions**: Lambda@Edge for visitor context handling
- **Database**: DynamoDB for storing visitor data and job matching information

## Authentication Flow

1. **Visitor Link Generation**:

   - Unique links are generated with format: `https://[domain]/?visitor=[linkId]`
   - Each link is associated with a temporary Cognito user account
   - Link data is stored in DynamoDB with an expiration time (TTL)

2. **Authentication Process**:

   - When a visitor accesses a link, Lambda@Edge intercepts the request
   - The function retrieves credentials from DynamoDB based on the `linkId`
   - It authenticates with Cognito and obtains JWT tokens
   - Tokens are set as cookies in the response

3. **Client-Side Authentication**:
   - The frontend reads authentication tokens from cookies
   - These tokens are used for API requests to AppSync and API Gateway

## Security Considerations

### Cookie Security

Our application uses non-HttpOnly cookies for authentication tokens due to the static nature of the frontend deployment. This is a deliberate architectural decision with the following considerations:

1. **Why non-HttpOnly cookies?**

   - Our frontend is statically deployed and requires client-side JavaScript to make authenticated API requests
   - HttpOnly cookies cannot be accessed by JavaScript, which would prevent our application from functioning

2. **Mitigating Security Risks**:
   - **SameSite=Strict**: Prevents CSRF attacks by ensuring cookies are only sent to same-site requests
   - **Secure flag**: Ensures cookies are only transmitted over HTTPS
   - **Short expiration times**: Tokens have limited validity periods
   - **Content Security Policy**: Implemented via Next.js middleware to mitigate XSS risks

### Security Headers via CloudFront

Since the application uses static export for S3 deployment, security headers are implemented at the CloudFront level using a Response Headers Policy. This approach provides better performance and compatibility with static hosting.

**Content Security Policy**:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' *.amazonaws.com *.execute-api.*.amazonaws.com;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
```

**Additional Security Headers**:

- **X-Content-Type-Options: nosniff**: Prevents MIME type sniffing
- **X-Frame-Options: DENY**: Prevents the page from being displayed in an iframe
- **Referrer-Policy: strict-origin-when-cross-origin**: Limits referrer information
- **Strict-Transport-Security**: Enforces HTTPS with 1-year max-age and includeSubDomains

These headers are applied at the edge, providing:

- Better performance (headers added at CloudFront edge locations)
- Compatibility with static exports
- Consistent security policy across all responses

### API Security

1. **AppSync GraphQL API**:

   - Secured with Cognito user pool authorization
   - Field-level authorization rules
   - Request validation with GraphQL schema

2. **API Gateway**:
   - Cognito authorizers for protected endpoints
   - CORS configuration limited to application domain
   - Rate limiting to prevent abuse

### Infrastructure Security

1. **CloudFront**:

   - HTTPS enforced with TLS 1.2+
   - Origin Access Control for S3 bucket access
   - Edge functions for request/response manipulation

2. **Lambda Functions**:

   - Principle of least privilege IAM roles
   - Environment variables stored in SSM Parameter Store
   - Cross-region references properly secured

3. **DynamoDB**:
   - Table-level encryption at rest
   - TTL for temporary data
   - Fine-grained access control

## Data Privacy

1. **Visitor Data**:

   - Only public professional information is stored and displayed
   - No personal data beyond basic contact information
   - All data has appropriate TTL settings

2. **Logging and Monitoring**:
   - CloudWatch logs for all Lambda functions
   - API Gateway access logging
   - CloudFront distribution logging

## Security Trade-offs

The application makes the following security trade-offs:

1. **Non-HttpOnly Cookies**: As explained above, this is necessary for the static frontend architecture but is mitigated with other security measures.

2. **'unsafe-inline' in CSP**: Required for Next.js static export functionality, mitigated by strict CSP for other directives.

3. **CloudFront vs Middleware**: Security headers are implemented at CloudFront level instead of Next.js middleware due to static export requirements, providing equivalent protection with better performance.

## Future Security Enhancements

1. Implement JWT token rotation
2. Add IP-based rate limiting
3. Consider server-side rendering options to enable HttpOnly cookies
4. Implement enhanced monitoring and alerting
