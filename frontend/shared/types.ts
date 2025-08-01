export type DeveloperType = {
  id: string;
  name: string;
  title: string;
  bio?: string;
  email?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  location?: string;
  yearsOfExperience?: number;
  skillSets?: SkillSetType[];
  isActive?: boolean;
  projects?: ProjectType[];
};

type SkillSetType = {
  id: string;
  name: string;
  skills: string[];
};

export type ProjectType = {
  id: string;
  title: string;
  description: string;
  status: string;
  highlights?: string[];
  tech?: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  order?: number;
  developer: DeveloperType;
  developerId: string;
};

export type CreateDeveloperInputType = {
  name: string;
  title: string;
  bio?: string;
  email?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  location?: string;
  yearsOfExperience?: number;
  skills?: string[];
  isActive?: boolean;
};

export type UpdateDeveloperInputType = {
  id: string;
  name?: string;
  title?: string;
  bio?: string;
  email?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  location?: string;
  yearsOfExperience?: number;
  skills?: string[];
  isActive?: boolean;
};

export type CreateProjectInputType = {
  title: string;
  description: string;
  status: string;
  highlights?: string[];
  tech?: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  order?: number;
  developerId: string;
};

export type UpdateProjectInputType = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  highlights?: string[];
  tech?: string[];
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  order?: number;
  developerId?: string;
};
