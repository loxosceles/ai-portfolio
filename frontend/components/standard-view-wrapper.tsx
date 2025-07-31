import React from 'react';

interface StandardViewWrapperProps {
  children: React.ReactNode;
}

// Transition constants
const TRANSITIONS = {
  BASE_TRANSITION: 'transition-all duration-600 ease-in-out'
} as const;

export default function StandardViewWrapper({ children }: StandardViewWrapperProps) {
  // Hero section doesn't need transitions, but maintains consistency
  return <div className={`relative ${TRANSITIONS.BASE_TRANSITION}`}>{children}</div>;
}
