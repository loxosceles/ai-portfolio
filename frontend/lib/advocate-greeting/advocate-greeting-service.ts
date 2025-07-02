'use client';

export interface AdvocateGreetingData {
  linkId: string;
  companyName?: string;
  recruiterName?: string;
  context?: string;
  greeting?: string;
  message?: string;
  skills?: string[];
}

export const advocateGreetingService = {
  async getAdvocateGreetingData(): Promise<AdvocateGreetingData | null> {
    return null;
  }
};
