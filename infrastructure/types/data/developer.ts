/**
 * Developer types
 */

/**
 * Skill
 */
export interface ISkill {
  name: string;
  level?: number;
}

/**
 * Skill set
 */
export interface ISkillSet {
  id: string;
  name: string;
  skills: string[];
}

/**
 * Developer profile
 */
export interface IDeveloper {
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
  skillSets: ISkillSet[];
}
