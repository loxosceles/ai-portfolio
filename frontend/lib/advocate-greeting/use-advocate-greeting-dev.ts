'use client';

import { useQuery } from '@apollo/client';
import { GET_ADVOCATE_GREETING } from '@/queries/advocate-greeting';
import { IAdvocateGreetingData } from './advocate-greeting-service';
import { useAuth } from '@/lib/auth/auth-context';

export function useAdvocateGreetingDev() {
  const { isAuthenticated, getQueryContext } = useAuth();

  // Use the standard query if authenticated
  const standardQuery = useQuery(GET_ADVOCATE_GREETING, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    context: getQueryContext('protected')
  });

  // Use standard query for authenticated users
  const greetingData = standardQuery.data?.getAdvocateGreeting;
  const isLoading = standardQuery.loading;
  const errorMessage = standardQuery.error?.message;

  return {
    greetingData: greetingData as IAdvocateGreetingData | null,
    isLoading,
    error: errorMessage,
    isAuthenticated // Only real token-based authentication
  };
}
