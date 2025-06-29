'use client';

import { useQuery } from '@apollo/client';
import { GET_JOB_MATCHING } from '@/queries/job-matching';
import { JobMatchingData } from './job-matching-service';
import { useAuth } from '@/lib/auth/auth-context';

export function useJobMatching() {
  const { isAuthenticated, getQueryContext } = useAuth();

  const { data, loading, error } = useQuery(GET_JOB_MATCHING, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
    context: getQueryContext('protected')
  });

  return {
    matchingData: data?.getJobMatching as JobMatchingData | null,
    isLoading: loading,
    error: error?.message || null,
    isAuthenticated
  };
}
