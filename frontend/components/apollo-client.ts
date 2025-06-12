import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { authService } from './auth-config';

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
  // For development, use API key if configured
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_APPSYNC_API_KEY
  ) {
    return {
      headers: {
        ...headers,
        'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
        'Content-Type': 'application/json'
      }
    };
  }

  // For production, use Cognito token
  const token = await authService.getToken();

  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network'
    },
    query: {
      fetchPolicy: 'network-only'
    }
  },
  name: 'portfolio-client',
  version: '1.0',
  assumeImmutableResults: true
});
