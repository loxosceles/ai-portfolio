'use client';

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
    // These are readable cookies set by your Lambda@Edge function
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
