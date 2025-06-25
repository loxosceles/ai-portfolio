'use client';

import { client } from '../apollo/apollo-client';
import { GET_JOB_MATCHING } from '../../queries/job-matching';

export interface JobMatchingData {
  linkId: string;
  companyName?: string;
  recruiterName?: string;
  context?: string;
  greeting?: string;
  message?: string;
  skills?: string[];
}

export const jobMatchingService = {
  async getJobMatchingData(): Promise<JobMatchingData | null> {
    try {
      const { data } = await client.query({
        query: GET_JOB_MATCHING,
        fetchPolicy: 'network-only'
      });

      return data?.getJobMatching || null;
    } catch (error) {
      console.error('Error in job matching service:', error);
      return null;
    }
  }
};
