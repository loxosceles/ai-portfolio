import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const createUserManager = () => {
  return new UserManager({
    authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ?? '',
    client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI ?? '',
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
