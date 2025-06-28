'use client';

import { useQuery, gql } from '@apollo/client';
import { useSearchParams } from 'next/navigation';
import { GET_JOB_MATCHING } from '@/queries/job-matching';
import { JobMatchingData } from './job-matching-service';
import { cookieAuth } from '@/lib/auth/cookie-auth';

// Mock data for development fallback
const DEV_MOCK_DATA: JobMatchingData = {
  linkId: 'dev-test-link',
  companyName: 'Example Tech',
  recruiterName: 'Jane Recruiter',
  context: 'engineering',
  greeting: 'Thanks for checking out my portfolio!',
  message:
    "I see you're looking for React and AWS expertise. I've worked extensively with both technologies on several projects.",
  skills: ['React', 'TypeScript', 'AWS', 'Node.js', 'GraphQL']
};

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
  const { accessToken } = cookieAuth.getTokens();
  const isAuthenticated = !!accessToken;

  // Check for local development mode via URL parameter
  const searchParams = useSearchParams();
  const visitorParam = searchParams?.get('visitor');
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'local';
  const isLocal = environment === 'local';

  // Local development mode is active if we're in local environment AND
  // there's any visitor parameter
  const localDevMode = isLocal && !!visitorParam;

  // Use the standard query if authenticated
  const standardQuery = useQuery(GET_JOB_MATCHING, {
    skip: !isAuthenticated || localDevMode, // Skip if not authenticated or in local dev mode
    fetchPolicy: 'cache-and-network',
    context: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  // Use direct linkId query if in local dev mode with a visitor parameter
  const directQuery = useQuery(GET_JOB_MATCHING_BY_LINK_ID, {
    variables: { linkId: visitorParam || 'dev-test-link' },
    skip: !localDevMode, // Only run this query if we're in local dev mode
    fetchPolicy: 'network-only', // Always fetch from network to avoid caching issues
    context: {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY
      }
    }
  });

  // Determine which data source to use
  let matchingData = null;
  let isLoading = false;
  let errorMessage = null;

  if (isAuthenticated && !localDevMode) {
    // Authenticated mode - use standard query
    matchingData = standardQuery.data?.getJobMatching;
    isLoading = standardQuery.loading;
    errorMessage = standardQuery.error?.message;
  } else if (localDevMode) {
    // Local dev mode - use direct query
    matchingData = directQuery.data?.getJobMatchingByLinkId;
    isLoading = directQuery.loading;
    errorMessage = directQuery.error?.message;

    // If we got an error or no data from direct query, log it and use mock data
    if (directQuery.error || (directQuery.called && !directQuery.loading && !matchingData)) {
      console.error('Error or no data from direct query:', directQuery.error);
      console.error('Falling back to mock data');
      matchingData =
        visitorParam === 'dev'
          ? DEV_MOCK_DATA
          : {
              ...DEV_MOCK_DATA,
              linkId: visitorParam,
              recruiterName: 'Unknown Recruiter',
              companyName: 'Unknown Company',
              message: `This is a fallback message for link ID: ${visitorParam}. No matching data was found in the database.`
            };
      isLoading = false;
    }
  }

  return {
    matchingData: matchingData as JobMatchingData | null,
    isLoading,
    error: errorMessage,
    isAuthenticated: isAuthenticated || localDevMode // Local dev mode OR valid tokens
  };
}
