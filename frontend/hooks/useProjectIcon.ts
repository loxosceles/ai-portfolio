import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export const useProjectIcon = (iconName?: string): LucideIcon | null => {
  return useMemo(() => {
    if (!iconName) return null;
    return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || null;
  }, [iconName]);
};
