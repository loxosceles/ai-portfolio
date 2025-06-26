import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { cookieAuth } from '@/lib/auth/cookie-auth';

const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;
const appsyncApiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;
const isDev = process.env.ENVIRONMENT === 'dev';

if (!appsyncUrl) {
  console.error('NEXT_PUBLIC_APPSYNC_URL is not defined in environment variables');
  throw new Error('AppSync URL is required');
}

if (!isDev && !appsyncApiKey) {
  console.warn('AppSync API Key is not defined (OK for deployed environments)');
}

// Create HTTP link with CORS mode but WITHOUT credentials
const httpLink = createHttpLink({
  uri: appsyncUrl, // Always use the AppSync URL directly to avoid CloudFront 403 errors
  fetchOptions: {
    mode: 'cors',
    // Omit credentials allows for wildcard CORS which is needed by AppSync/ Lambda@Edge
    credentials: 'omit'
  }
});

const authLink = setContext(async (_, { headers }) => {
  // Skip auth during SSR
  if (typeof window === 'undefined') {
    return { headers };
  }

  // In local development, use API key
  if (isDev) {
    return {
      headers: {
        ...headers,
        'x-api-key': appsyncApiKey,
        'Content-Type': 'application/json'
      }
    };
  }

  // In deployed environments, ONLY use Cognito tokens
  const { accessToken } = cookieAuth.getTokens();
  if (!accessToken) {
    console.error('No access token available in deployed environment');
    throw new Error('Authentication required');
  }

  return {
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
});

export const client = new ApolloClient({
  ssrMode: typeof window === 'undefined',
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    addTypename: true
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: typeof window === 'undefined' ? 'network-only' : 'cache-first'
    }
  },
  name: 'portfolio-client',
  version: '1.0',
  assumeImmutableResults: true,
  connectToDevTools: process.env.ENVIRONMENT === 'development' && typeof window !== 'undefined'
});
