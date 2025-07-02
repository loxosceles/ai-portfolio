'use client';

import { useQuery } from '@apollo/client';
import { GET_ADVOCATE_GREETING } from '@/queries/advocate-greeting';
import { AdvocateGreetingData } from './advocate-greeting-service';
import { useAuth } from '@/lib/auth/auth-context';

export function useAdvocateGreeting() {
  const { isAuthenticated, getQueryContext } = useAuth();

  const { data, loading, error } = useQuery(GET_ADVOCATE_GREETING, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    context: getQueryContext('protected')
  });

  return {
    greetingData: data?.getAdvocateGreeting as AdvocateGreetingData | null,
    isLoading: loading,
    error: error?.message || null,
    isAuthenticated
  };
}
