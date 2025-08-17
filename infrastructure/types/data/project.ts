/**
 * Project types
 */

/**
 * Project status
 */
export type ProjectStatus = 'Active' | 'Completed' | 'Planned';

/**
 * Project
 */
export interface IProject {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  highlights: string[];
  techStack: string[];
  architecture?: Array<{
    name: string;
    details: string;
  }>;
  technicalShowcases?: Array<{
    title: string;
    description: string;
    highlights: string[];
  }>;
  imageUrl?: string;
  icon?: string;
  developerId: string;
}
