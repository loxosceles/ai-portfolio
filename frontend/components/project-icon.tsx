import { ProjectType } from '@/shared/types';
import { useProjectIcon } from '@/hooks/useProjectIcon';

interface ProjectIconProps {
  project: ProjectType;
  className?: string;
}

export default function ProjectIcon({ project, className = 'h-6 w-6' }: ProjectIconProps) {
  const IconComponent = useProjectIcon(project.icon);

  return IconComponent ? <IconComponent className={className} /> : null;
}
