# Authentication Flow

## Overview

The AI Portfolio implements a sophisticated "invisible authentication" system that provides personalized experiences without requiring visitors to explicitly log in. This document explains the authentication flow and how personalized links work.

## Link-Based Authentication System

### Core Concept

The system uses personalized links containing tokens that authenticate visitors automatically. Each link is associated with a virtual Cognito user, allowing for secure, personalized content delivery without traditional login screens.

### Components

1. **Link Generator Tool**

   - Creates personalized URLs for specific visitors/recruiters
   - Associates each link with visitor metadata (company, role, etc.)
   - Stores link-visitor associations in DynamoDB

2. **Virtual Cognito Users**

   - Each personalized link corresponds to a virtual user in AWS Cognito
   - These users exist solely to provide authentication context
   - No password or explicit login is required

3. **Lambda@Edge Function**

   - Intercepts requests to CloudFront
   - Validates tokens from URL parameters
   - Sets authentication cookies for the browser session

4. **Apollo GraphQL Client**
   - Uses authentication tokens from cookies for API requests
   - Provides personalized data based on the visitor's identity

## Authentication Flow

1. **Link Creation**

   - Portfolio owner creates a personalized link for a recruiter
   - System creates a virtual Cognito user and generates access tokens
   - Link with embedded token is shared with the recruiter

2. **Visitor Access**

   - Recruiter clicks the personalized link
   - CloudFront receives the request with the token parameter
   - Lambda@Edge validates the token and sets `AccessToken` and `IdToken` cookies

3. **Frontend Authentication**

   - Next.js frontend loads with authentication cookies already set
   - Apollo client extracts tokens from cookies
   - GraphQL requests include the token in the Authorization header

4. **API Authorization**
   - AppSync API validates the token against Cognito
   - Resolvers use the visitor's identity to return personalized content
   - Access control ensures visitors only see content intended for them

## Security Considerations

- **Tokenized Links**: Each URL contains a secure token tied to a specific virtual Cognito user
- **Content Isolation**: Visitors can only access personalized content intended for them
- **Tamper-Proof Design**: URL manipulation is ineffective as authentication is tied to backend Cognito identities
- **Cookie Security**: Authentication cookies use SameSite=Strict to prevent CSRF attacks
- **Content Security Policy**: Headers mitigate XSS risks
- **Short Token Expiration**: Tokens have limited validity periods

## Direct URL Access

When a visitor accesses the base URL without a personalized link:

- No authentication tokens are available
- The Apollo client cannot make authenticated requests
- Only public content is visible
- Personalized features are not accessible

This is by design - the system expects visitors to use personalized links for the full experience.

## Technical Implementation

The authentication flow is implemented across several components:

1. **Link Generator**:

   ```typescript
   // Creates a virtual user and generates a personalized link
   async function generateLink(visitorInfo) {
     // Create virtual Cognito user
     // Generate and store tokens
     // Return personalized URL with embedded token
   }
   ```

2. **Lambda@Edge**:

   ```typescript
   // Intercepts requests and sets authentication cookies
   exports.handler = async (event) => {
     // Extract token from URL parameters
     // Validate token against Cognito
     // Set authentication cookies in response
   };
   ```

3. **Cookie Authentication**:

   ```typescript
   // Extracts tokens from cookies for API requests
   const cookieAuth = {
     getTokens() {
       // Read AccessToken and IdToken from cookies
       return { accessToken, idToken };
     }
   };
   ```

4. **Apollo Client**:
   ```typescript
   // Uses tokens for authenticated GraphQL requests
   const authLink = setContext(async (_, { headers }) => {
     const { accessToken } = cookieAuth.getTokens();
     if (!accessToken) {
       // Handle unauthenticated state
     }
     return {
       headers: {
         ...headers,
         Authorization: `Bearer ${accessToken}`
       }
     };
   });
   ```

This authentication flow provides a seamless, secure experience for visitors while maintaining strict access control and personalization capabilities.
