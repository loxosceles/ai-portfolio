import Cookies from 'js-cookie';
import { getEnvironment } from '@/lib/auth/auth-utils';

export const setDevelopmentCookies = (visitorQParam: string) => {
  if (getEnvironment() === 'local' && visitorQParam === 'test123') {
    Cookies.set('visitor_company', 'Test Company', {
      path: '/',
      secure: true,
      sameSite: 'none'
    });

    Cookies.set('visitor_name', 'John Doe', {
      path: '/',
      secure: true,
      sameSite: 'none'
    });

    Cookies.set('visitor_context', 'engineering', {
      path: '/',
      secure: true,
      sameSite: 'none'
    });
  }
};
