'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getEnvironment } from '@/lib/auth/auth-utils';

/**
 * Debug component to test auth context functionality
 * Remove this component after testing
 */
export default function AuthDebug() {
  const { isAuthenticated, environment, tokens, visitorParam, getAuthHeaders } = useAuth();

  if (getEnvironment() === 'prod') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        borderRadius: '4px',
        zIndex: 9999,
        maxWidth: '300px'
      }}
    >
      <h4>Auth Debug</h4>
      <p>Environment: {environment}</p>
      <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      <p>Visitor Param: {visitorParam || 'None'}</p>
      <p>Access Token: {tokens.accessToken ? 'Present' : 'None'}</p>
      <p>ID Token: {tokens.idToken ? 'Present' : 'None'}</p>
      <details>
        <summary>Headers</summary>
        <pre>Public: {JSON.stringify(getAuthHeaders('public'), null, 2)}</pre>
        <pre>Protected: {JSON.stringify(getAuthHeaders('protected'), null, 2)}</pre>
      </details>
    </div>
  );
}
