'use client';
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import outputs from '@/amplify_outputs.json';

// Create HTTP link to your Amplify GraphQL endpoint
const httpLink = createHttpLink({
  uri: outputs.data.url
});

// Create auth link with only API key
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      'x-api-key': outputs.data.api_key,
      'Content-Type': 'application/json'
    }
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  connectToDevTools: true,
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all'
    },
    query: {
      errorPolicy: 'all'
    }
  }
});

export default apolloClient;
