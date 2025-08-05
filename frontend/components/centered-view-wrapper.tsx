import React, { useEffect, useState } from 'react';

interface CenteredViewWrapperProps {
  isTarget: boolean;
  globalTransitionPhase: 'normal' | 'transitioning' | 'centered';
  positionRelativeToContact: 'above' | 'below' | 'same';
  children: React.ReactNode;
}

// Transition constants
const TRANSITIONS = {
  BASE_TRANSITION: 'transition-all duration-600 ease-in-out'
} as const;

export default function CenteredViewWrapper({
  isTarget,
  globalTransitionPhase,
  positionRelativeToContact,
  children
}: CenteredViewWrapperProps) {
  const [phase, setPhase] = useState<'normal' | 'transitioning' | 'centered'>('normal');

  // Target logic
  useEffect(() => {
    if (isTarget) {
      setPhase('transitioning');
      const timer = setTimeout(() => setPhase('centered'), 400);
      return () => clearTimeout(timer);
    } else {
      setPhase('normal');
    }
  }, [isTarget]);

  // Non-target logic - fade when other sections are targeted
  useEffect(() => {
    if (!isTarget && globalTransitionPhase !== 'normal') {
      // Upper sections (above contact) fade immediately, others wait
      const delay = positionRelativeToContact === 'above' ? 0 : 200;
      const timer = setTimeout(() => setPhase(globalTransitionPhase), delay);
      return () => clearTimeout(timer);
    } else if (!isTarget) {
      setPhase('normal');
    }
  }, [isTarget, globalTransitionPhase, positionRelativeToContact]);

  const getTransformClass = () => {
    // Non-targets fade out
    if (!isTarget && (phase === 'transitioning' || phase === 'centered')) {
      return `${TRANSITIONS.BASE_TRANSITION} opacity-0`;
    }
    return TRANSITIONS.BASE_TRANSITION;
  };

  return (
    <div className={`relative ${getTransformClass()} ${phase !== 'normal' ? 'fade-underlay' : ''}`}>
      {children}
    </div>
  );
}
