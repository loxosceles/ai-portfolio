'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { cookieAuth } from './cookie-auth';
import { getEnvironment } from './auth-utils';

export type Environment = 'local' | 'dev' | 'prod';
export type RouteType = 'public' | 'protected';

interface AuthTokens {
  accessToken: string | null;
  idToken: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  environment: Environment;
  tokens: AuthTokens;
  visitorParam: string | null;
  getAuthHeaders: (routeType: RouteType) => Record<string, string>;
  getQueryContext: (routeType: RouteType) => { headers: Record<string, string> };
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens>({ accessToken: null, idToken: null });
  const [mounted, setMounted] = useState(false);
  const [visitorParam, setVisitorParam] = useState<string | null>(null);

  // Detect environment using the helper function
  const environment: Environment = getEnvironment();

  // Refresh auth state from cookies
  const refreshAuthState = () => {
    if (typeof window === 'undefined') return;

    const currentTokens = cookieAuth.getTokens();
    setTokens(currentTokens);
  };

  // Initialize auth state on mount
  useEffect(() => {
    setMounted(true);
    refreshAuthState();

    // Get visitor parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setVisitorParam(params.get('visitor'));
    }
  }, []);

  // Check for token changes periodically (in case cookies are updated by Lambda@Edge)
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      const currentTokens = cookieAuth.getTokens();
      if (
        currentTokens.accessToken !== tokens.accessToken ||
        currentTokens.idToken !== tokens.idToken
      ) {
        setTokens(currentTokens);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [mounted, tokens.accessToken, tokens.idToken]);

  // Determine if user is authenticated
  const isAuthenticated = environment === 'local' ? !!visitorParam : !!tokens.accessToken;

  // Generate auth headers based on route type and environment
  const getAuthHeaders = (routeType: RouteType): Record<string, string> => {
    // Local development - return minimal headers (hooks will handle mocking)
    if (environment === 'local') {
      return {
        'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
      };
    }

    // Public routes in deployed environments use API key
    if (routeType === 'public') {
      return {
        'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
      };
    }

    // Protected routes use Cognito tokens
    if (tokens.accessToken) {
      return {
        Authorization: `Bearer ${tokens.accessToken}`
      };
    }

    // Fallback to API key if no tokens available
    return {
      'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY || ''
    };
  };

  // Generate query context for Apollo Client
  const getQueryContext = (routeType: RouteType) => {
    return {
      headers: getAuthHeaders(routeType)
    };
  };

  const contextValue: AuthContextValue = {
    isAuthenticated,
    environment,
    tokens,
    visitorParam,
    getAuthHeaders,
    getQueryContext,
    refreshAuthState
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
