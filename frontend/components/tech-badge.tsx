import React from 'react';

interface TechBadgeProps {
  tech: string;
  variant?: 'primary' | 'secondary';
}

export default function TechBadge({ tech, variant = 'primary' }: TechBadgeProps) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium transition-colors';
  const variantClasses =
    variant === 'primary'
      ? 'bg-primary/20 text-primary border border-primary/30'
      : 'bg-secondary/10 text-secondary border border-secondary/20';

  return <span className={`${baseClasses} ${variantClasses}`}>{tech}</span>;
}
