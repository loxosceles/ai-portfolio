import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

const isValidLucideIcon = (icon: unknown): icon is LucideIcon => {
  return typeof icon === 'function';
};

export const useProjectIcon = (iconName?: string): LucideIcon | null => {
  if (!iconName) return null;

  const icon = LucideIcons[iconName as keyof typeof LucideIcons];
  return isValidLucideIcon(icon) ? icon : null;
};
