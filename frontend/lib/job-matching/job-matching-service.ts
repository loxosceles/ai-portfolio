'use client';

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
    return null;
  }
};
