'use client';

import { useQuery, gql } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import { GET_ADVOCATE_GREETING } from '@/queries/advocate-greeting';
import { AdvocateGreetingData } from './advocate-greeting-service';
import { useAuth } from '@/lib/auth/auth-context';

// Mock data removed - now handled by local interceptor

// Direct query for advocate greeting by linkId (for development)
const GET_ADVOCATE_GREETING_BY_LINK_ID = gql`
  query GetAdvocateGreetingByLinkId($linkId: String!) {
    getAdvocateGreetingByLinkId(linkId: $linkId) {
      linkId
      companyName
      recruiterName
      context
      greeting
      message
      skills
    }
  }
`;

export function useAdvocateGreetingDev() {
  const { isAuthenticated, getQueryContext } = useAuth();

  // Check for visitor parameter (for deployed dev environment)
  const searchParams = useSearchParams();
  const visitorParam = searchParams?.get('visitor');

  // Use the standard query if authenticated
  const standardQuery = useQuery(GET_ADVOCATE_GREETING, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    context: getQueryContext('protected')
  });

  // Use direct linkId query for deployed dev environment with visitor parameter
  const directQuery = useQuery(GET_ADVOCATE_GREETING_BY_LINK_ID, {
    variables: { linkId: visitorParam || 'dev-test-link' },
    skip: !visitorParam || isAuthenticated, // Skip if no visitor param or already authenticated
    fetchPolicy: 'network-only',
    context: getQueryContext('public')
  });

  // Determine which data source to use
  let greetingData = null;
  let isLoading = false;
  let errorMessage = null;

  if (isAuthenticated) {
    // Authenticated mode - use standard query
    greetingData = standardQuery.data?.getAdvocateGreeting;
    isLoading = standardQuery.loading;
    errorMessage = standardQuery.error?.message;
  } else if (visitorParam) {
    // Deployed dev environment with visitor param - use direct query
    greetingData = directQuery.data?.getAdvocateGreetingByLinkId;
    isLoading = directQuery.loading;
    errorMessage = directQuery.error?.message;
  }

  return {
    greetingData: greetingData as AdvocateGreetingData | null,
    isLoading,
    error: errorMessage,
    isAuthenticated // Only real token-based authentication
  };
}
