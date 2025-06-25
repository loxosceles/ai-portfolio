'use client';

/**
 * Cookie authentication utilities
 *
 * SECURITY NOTE: This implementation uses non-HttpOnly cookies for authentication tokens
 * because our static frontend needs JavaScript access to these tokens for client-side API requests.
 * Additional security measures are implemented:
 * 1. SameSite=Strict cookie attribute to prevent CSRF
 * 2. Content Security Policy headers to mitigate XSS risks
 * 3. Short token expiration times
 */

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export const cookieAuth = {
  getTokens(): { accessToken: string | null; idToken: string | null } {
    // These are readable cookies set by the Lambda@Edge function
    const accessToken = getCookie('AccessToken');
    const idToken = getCookie('IdToken');

    return { accessToken, idToken };
  },

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const { accessToken } = this.getTokens();

    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      }
    });
  },

  isAuthenticated(): boolean {
    const { accessToken } = this.getTokens();
    return !!accessToken;
  }
};
