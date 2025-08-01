import React, { useState, useEffect } from 'react';
import StandardViewWrapper from './standard-view-wrapper';
import CenteredViewWrapper from './centered-view-wrapper';
import UpwardTransitionWrapper from './upward-transition-wrapper';

interface TransitionManagerProps {
  targetSection: string;
  children: React.ReactNode[];
}

export default function TransitionManager({ targetSection, children }: TransitionManagerProps) {
  const [globalTransitionPhase, setGlobalTransitionPhase] = useState<
    'normal' | 'transitioning' | 'centered'
  >('normal');

  // Track when target changes to trigger global transition
  useEffect(() => {
    if (targetSection !== 'hero') {
      setGlobalTransitionPhase('transitioning');
      const timer = setTimeout(() => {
        setGlobalTransitionPhase('centered');
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setGlobalTransitionPhase('normal');
    }
  }, [targetSection]);

  // Add scroll listener to reset global transition phase
  useEffect(() => {
    const handleScroll = () => {
      if (globalTransitionPhase !== 'normal') {
        setGlobalTransitionPhase('normal');
      }
    };

    const handleClick = () => {
      if (globalTransitionPhase !== 'normal') {
        setGlobalTransitionPhase('normal');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick);
    };
  }, [globalTransitionPhase]);

  // Helper to get position relative to contact
  const getPositionRelativeToContact = (sectionId: string): 'above' | 'below' | 'same' => {
    const sectionOrder = ['hero', 'featured', 'skills', 'ai-portfolio', 'contact'];
    const sectionIndex = sectionOrder.indexOf(sectionId);
    const contactIndex = sectionOrder.indexOf('contact');

    if (sectionIndex < contactIndex) return 'above';
    if (sectionIndex > contactIndex) return 'below';
    return 'same';
  };

  return (
    <>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const isTarget = targetSection === (child.props as { id: string }).id;
        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;
        const positionRelativeToContact = getPositionRelativeToContact(
          (child.props as { id: string }).id
        );

        if (isFirst) {
          return (
            <StandardViewWrapper
              key={(child.props as { id: string }).id}
              isTarget={isTarget}
              globalTransitionPhase={globalTransitionPhase}
              positionRelativeToContact={positionRelativeToContact}
            >
              {child}
            </StandardViewWrapper>
          );
        }

        if (isLast) {
          return (
            <UpwardTransitionWrapper
              key={(child.props as { id: string }).id}
              isTarget={isTarget}
              globalTransitionPhase={globalTransitionPhase}
              positionRelativeToContact={positionRelativeToContact}
            >
              {child}
            </UpwardTransitionWrapper>
          );
        }

        return (
          <CenteredViewWrapper
            key={(child.props as { id: string }).id}
            isTarget={isTarget}
            globalTransitionPhase={globalTransitionPhase}
            positionRelativeToContact={positionRelativeToContact}
          >
            {child}
          </CenteredViewWrapper>
        );
      })}
    </>
  );
}
