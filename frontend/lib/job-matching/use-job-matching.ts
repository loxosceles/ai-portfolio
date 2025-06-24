'use client';

import { useState, useEffect } from 'react';
import { jobMatchingService, JobMatchingData } from './job-matching-service';

export function useJobMatching() {
  const [matchingData, setMatchingData] = useState<JobMatchingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatchingData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await jobMatchingService.getJobMatchingData();
        setMatchingData(data);
      } catch (err) {
        setError('Failed to load job matching data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatchingData();
  }, []);

  return {
    matchingData,
    isLoading,
    error
  };
}
