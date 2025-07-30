import React, { useEffect, useState } from 'react';

interface TransitionManagerProps {
  sectionId: string;
  isActive: boolean;
  children: React.ReactNode;
  transitionType?: 'reset' | 'slideDown' | 'slideUp';
}

export default function TransitionManager({
  sectionId,
  isActive,
  children,
  transitionType = 'reset'
}: TransitionManagerProps) {
  const [justBecameActive, setJustBecameActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      setJustBecameActive(true);
      // Reset after tracking the activation
      const timeout = setTimeout(() => setJustBecameActive(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [isActive]);

  return <>{children}</>;
}
