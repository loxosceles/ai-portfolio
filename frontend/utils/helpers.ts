import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export const getProjectIcon = (iconName?: string): LucideIcon | null => {
  if (!iconName) return null;
  return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName] || null;
};
