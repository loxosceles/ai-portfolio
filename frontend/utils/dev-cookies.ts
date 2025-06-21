import Cookies from 'js-cookie';

export const setDevelopmentCookies = (visitorHash: string) => {
  if (process.env.NODE_ENV === 'development' && visitorHash === 'test123') {
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
