import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { authService } from '../auth/auth-config';

const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;

if (!appsyncUrl) {
  console.error('AppSync URL is not defined in environment variables');
}

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_APPSYNC_URL,
  fetchOptions: {
    mode: 'cors'
  }
});

const authLink = setContext(async (_, { headers }) => {
  // Skip auth during SSR
  if (typeof window === 'undefined') {
    return { headers };
  }

  // In development, always use API key for all operations
  if (!isProduction && appsyncApiKey) {
    return {
      headers: {
        ...headers,
        'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
        'Content-Type': 'application/json'
      }
    };
  }

  // For production, use Cognito token
  try {
    const token = await authService.getToken();
    return {
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { headers };
  }
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
