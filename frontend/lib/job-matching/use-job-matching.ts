'use client';

import { useQuery } from '@apollo/client';
import { GET_JOB_MATCHING } from '@/queries/job-matching';
import { JobMatchingData } from './job-matching-service';
import { cookieAuth } from '@/lib/auth/cookie-auth';

export function useJobMatching() {
  const { accessToken } = cookieAuth.getTokens();
  const isAuthenticated = !!accessToken;

  const { data, loading, error } = useQuery(GET_JOB_MATCHING, {
    skip: !isAuthenticated, // Don't run query if no ID token
    fetchPolicy: 'cache-and-network'
  });

  return {
    matchingData: data?.getJobMatching as JobMatchingData | null,
    isLoading: loading,
    error: error?.message || null,
    isAuthenticated
  };
}
