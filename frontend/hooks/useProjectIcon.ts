import { ParenthesesInitialsIcon, ImagesIcon, ApertureIcon } from '@/components/icons';
import { ComponentType } from 'react';

interface IconProps {
  className?: string;
}

type IconComponent = ComponentType<IconProps>;

const iconMap: Record<string, IconComponent> = {
  ParenthesesInitials: ParenthesesInitialsIcon,
  KeyboardCircle: ParenthesesInitialsIcon, // Fallback for old data
  Bot: ParenthesesInitialsIcon, // Fallback for old data
  Images: ImagesIcon,
  Aperture: ApertureIcon
};

export const useProjectIcon = (iconName?: string): IconComponent | null => {
  if (!iconName) {
    return null;
  }
  const icon = iconMap[iconName];
  return icon || null;
};
