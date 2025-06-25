import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { cookieAuth } from '../auth/cookie-auth';

const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;
const appsyncApiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;

if (!appsyncApiKey) {
  console.error('AppSync API Key is not defined in environment variables');
}

if (!appsyncUrl) {
  console.error('AppSync URL is not defined in environment variables');
}

// Create HTTP link with CORS mode but WITHOUT credentials
const httpLink = createHttpLink({
  uri: appsyncUrl,
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

  // Try ID token first (recruiters with special links)
  try {
    const { accessToken } = cookieAuth.getTokens();
    if (accessToken) {
      return {
        headers: {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
    }
  } catch (error) {
    console.error('Error getting ID token:', error);
  }

  // Fallback to API key (anonymous visitors)
  if (appsyncApiKey) {
    return {
      headers: {
        ...headers,
        'x-api-key': appsyncApiKey,
        'Content-Type': 'application/json'
      }
    };
  }

  return { headers };
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
