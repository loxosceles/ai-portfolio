import { Aperture } from 'lucide-react';

interface ApertureIconProps {
  className?: string;
}

export default function ApertureIcon({ className = 'h-6 w-6' }: ApertureIconProps) {
  return <Aperture className={className} />;
}
