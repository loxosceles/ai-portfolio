'use client';

export interface IAdvocateGreetingData {
  linkId: string;
  companyName?: string;
  recruiterName?: string;
  context?: string;
  greeting?: string;
  message?: string;
  skills?: string[];
}

export const advocateGreetingService = {
  async getAdvocateGreetingData(): Promise<IAdvocateGreetingData | null> {
    return null;
  }
};
