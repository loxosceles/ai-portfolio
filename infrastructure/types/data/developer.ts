/**
 * Developer types
 */

/**
 * Skill
 */
export interface Skill {
  name: string;
  level?: number;
}

/**
 * Skill set
 */
export interface SkillSet {
  id: string;
  name: string;
  skills: string[];
}

/**
 * Developer profile
 */
export interface Developer {
  id: string;
  name: string;
  title: string;
  bio: string;
  email: string;
  website?: string;
  github?: string;
  linkedin?: string;
  location?: string;
  yearsOfExperience: number;
  isActive: boolean;
  skillSets: SkillSet[];
}
