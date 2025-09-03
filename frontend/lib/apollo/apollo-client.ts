import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { isLocalEnvironment } from '@/lib/auth/auth-utils';

const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;
const appsyncApiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;

// Environment strategy:
// - 'local': API key auth for local development
// - 'dev': Cognito auth for deployed development environment
// - 'prod': Cognito auth for production
const isLocal = isLocalEnvironment();

if (!appsyncUrl) {
  console.error('NEXT_PUBLIC_APPSYNC_URL is not defined in environment variables');
  throw new Error('AppSync URL is required');
}

if (isLocal && !appsyncApiKey) {
  console.warn('AppSync API Key is not defined but required for local development');
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

  // No default headers - each query specifies its own auth via context
  return {
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  };
});

export const client = new ApolloClient({
  ssrMode: typeof window === 'undefined',
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
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
  clientAwareness: {
    name: 'portfolio-client',
    version: '1.0'
  },
  assumeImmutableResults: true,
  devtools: {
    enabled: isLocal && typeof window !== 'undefined' && !!appsyncApiKey
  }
});
