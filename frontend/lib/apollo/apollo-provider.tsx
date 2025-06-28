'use client';

import React, { useEffect } from 'react';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo-client';
import { getEnvironment } from '@/lib/auth/auth-utils';

export default function GraphQLProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Connect to VSCode DevTools in development
    if (getEnvironment() === 'local') {
      import('@apollo/client-devtools-vscode')
        .then(({ connectApolloClientToVSCodeDevTools }) => {
          connectApolloClientToVSCodeDevTools(client, 'ws://localhost:7095');
        })
        .catch((error) => {
          console.error('VSCode DevTools not available:', error.message);
        });
    }
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
