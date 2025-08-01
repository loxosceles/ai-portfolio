import React, { useEffect, useState } from 'react';

interface UpwardTransitionWrapperProps {
  isTarget: boolean;
  globalTransitionPhase: 'normal' | 'transitioning' | 'centered';
  positionRelativeToContact: 'above' | 'below' | 'same';
  children: React.ReactNode;
}

// Transition constants
const TRANSITIONS = {
  BASE_TRANSITION: 'transition-all duration-600 ease-in-out',
  TARGET_FROM_TOP:
    'transition-transform duration-600 ease-in-out transform -translate-y-[calc(50vh-50%)]'
} as const;

export default function UpwardTransitionWrapper({
  isTarget,
  globalTransitionPhase,
  positionRelativeToContact,
  children
}: UpwardTransitionWrapperProps) {
  const [phase, setPhase] = useState<'normal' | 'transitioning' | 'centered'>('normal');

  // Target logic
  useEffect(() => {
    if (isTarget) {
      setPhase('transitioning');
      const timer = setTimeout(() => setPhase('centered'), 800); // Longer delay for contact
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

  // Scroll reset for contact section
  useEffect(() => {
    if (phase !== 'centered') return;

    const handleScroll = () => setPhase('normal');
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [phase]);

  const getTransformClass = () => {
    // Non-targets fade out
    if (!isTarget && (phase === 'transitioning' || phase === 'centered')) {
      return `${TRANSITIONS.BASE_TRANSITION} opacity-0`;
    }
    // Target centers itself
    if (phase === 'centered' && isTarget) {
      return TRANSITIONS.TARGET_FROM_TOP;
    }
    return TRANSITIONS.BASE_TRANSITION;
  };

  return (
    <div className={`relative ${getTransformClass()} ${phase !== 'normal' ? 'fade-underlay' : ''}`}>
      {children}
    </div>
  );
}
