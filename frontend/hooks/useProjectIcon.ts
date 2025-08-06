import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

const isValidLucideIcon = (icon: unknown): icon is LucideIcon => {
  return icon !== undefined && icon !== null;
};

export const useProjectIcon = (iconName?: string): LucideIcon | null => {
  return useMemo(() => {
    if (!iconName) return null;

    const icon = LucideIcons[iconName as keyof typeof LucideIcons];
    return isValidLucideIcon(icon) ? icon : null;
  }, [iconName]);
};
