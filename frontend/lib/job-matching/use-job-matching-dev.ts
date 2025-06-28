'use client';

import { useQuery, gql } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import { GET_JOB_MATCHING } from '@/queries/job-matching';
import { JobMatchingData } from './job-matching-service';
import { useAuth } from '@/lib/auth/auth-context';

// Mock data removed - now handled by local interceptor

// Direct query for job matching by linkId (for development)
const GET_JOB_MATCHING_BY_LINK_ID = gql`
  query GetJobMatchingByLinkId($linkId: String!) {
    getJobMatchingByLinkId(linkId: $linkId) {
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

export function useJobMatchingDev() {
  const { isAuthenticated, getQueryContext } = useAuth();

  // Check for visitor parameter (for deployed dev environment)
  const searchParams = useSearchParams();
  const visitorParam = searchParams?.get('visitor');

  // Use the standard query if authenticated
  const standardQuery = useQuery(GET_JOB_MATCHING, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    context: getQueryContext('protected')
  });

  // Use direct linkId query for deployed dev environment with visitor parameter
  const directQuery = useQuery(GET_JOB_MATCHING_BY_LINK_ID, {
    variables: { linkId: visitorParam || 'dev-test-link' },
    skip: !visitorParam || isAuthenticated, // Skip if no visitor param or already authenticated
    fetchPolicy: 'network-only',
    context: getQueryContext('public')
  });

  // Determine which data source to use
  let matchingData = null;
  let isLoading = false;
  let errorMessage = null;

  if (isAuthenticated) {
    // Authenticated mode - use standard query
    matchingData = standardQuery.data?.getJobMatching;
    isLoading = standardQuery.loading;
    errorMessage = standardQuery.error?.message;
  } else if (visitorParam) {
    // Deployed dev environment with visitor param - use direct query
    matchingData = directQuery.data?.getJobMatchingByLinkId;
    isLoading = directQuery.loading;
    errorMessage = directQuery.error?.message;
  }

  return {
    matchingData: matchingData as JobMatchingData | null,
    isLoading,
    error: errorMessage,
    isAuthenticated // Only real token-based authentication
  };
}
