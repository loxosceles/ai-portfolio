import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const cognitoAuthority = process.env.NEXT_PUBLIC_COGNITO_AUTHORITY;
const cognitoClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;

if (!cognitoAuthority || !cognitoClientId || !redirectUri) {
  console.error('Cognito configuration is missing in environment variables');
  console.error('Authority:', cognitoAuthority);
  console.error('Client ID:', cognitoClientId);
  console.error('Redirect URI:', redirectUri);
}

const createUserManager = () => {
  return new UserManager({
    authority: cognitoAuthority ?? '',
    client_id: cognitoClientId ?? '',
    redirect_uri: redirectUri ?? '',
    response_type: 'code',
    scope: 'openid email profile phone',
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage })
  });
};

export const authService = {
  userManager: typeof window !== 'undefined' ? createUserManager() : null,

  async getToken(): Promise<string | null> {
    try {
      const user = await this.userManager?.getUser();
      return user?.access_token ?? null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async signIn() {
    await this.userManager?.signinRedirect();
  },

  async signOut() {
    await this.userManager?.signoutRedirect({
      post_logout_redirect_uri: `${window.location.origin}/login`
    });
  }
};
