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
  imageUrl?: string;
  icon?: string;
  developerId: string;
}
