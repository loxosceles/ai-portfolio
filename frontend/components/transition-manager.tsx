import React, { useEffect, useState } from 'react';

interface TransitionManagerProps {
  sectionId: string;
  isTarget: boolean;
  positionRelativeToTarget?: 'above' | 'below' | 'same';
  children: React.ReactNode;
  targetTransition?: 'reset' | 'centerFromBottom' | 'centerFromTop';
  globalTransitionPhase?: 'normal' | 'transitioning' | 'centered';
}

// Transition constants
const TRANSITIONS = {
  // Target transitions - slide into center
  BASE_TRANSITION: 'transition-all duration-600 ease-in-out',
  TARGET_FROM_BOTTOM:
    'transition-transform duration-600 ease-in-out transform translate-y-[calc(50vh-50%)]',
  TARGET_FROM_TOP:
    'transition-transform duration-600 ease-in-out transform -translate-y-[calc(50vh-50%)] z-50'
} as const;

export default function TransitionManager({
  sectionId,
  isTarget,
  positionRelativeToTarget,
  children,
  targetTransition = 'reset',
  globalTransitionPhase = 'normal'
}: TransitionManagerProps) {
  const [phase, setPhase] = useState<'normal' | 'transitioning' | 'centered'>('normal');

  // Add state for scroll detection
  const [isScrolling, setIsScrolling] = useState(false);

  // Single effect handles all phase transitions
  useEffect(() => {
    if (isTarget && targetTransition !== 'reset') {
      // Target: start transition immediately
      setPhase('transitioning');
      const timer = setTimeout(() => setPhase('centered'), 400);
      return () => clearTimeout(timer);
    } else if (!isTarget && globalTransitionPhase !== 'normal') {
      // Non-target: follow global phase with delay
      const delay = globalTransitionPhase === 'transitioning' ? 200 : 0;
      const timer = setTimeout(() => setPhase(globalTransitionPhase), delay);
      return () => clearTimeout(timer);
    } else {
      // Reset to normal (both targets when reset and non-targets when global is normal)
      setPhase('normal');
    }
  }, [isTarget, targetTransition, globalTransitionPhase]);

  // Combined scroll handling (detection + reset)
  // useEffect(() => {
  //   if (!isTarget || targetTransition === 'reset') return;

  //   let scrollTimeout: NodeJS.Timeout;

  //   const handleScroll = () => {
  //     // Reset if already centered
  //     if (phase === 'centered') {
  //       setPhase('normal');
  //       return;
  //     }

  //     // Detect scroll completion
  //     setIsScrolling(true);
  //     clearTimeout(scrollTimeout);
  //     scrollTimeout = setTimeout(() => setIsScrolling(false), 150);
  //   };

  //   window.addEventListener('scroll', handleScroll, { passive: true });
  //   return () => {
  //     window.removeEventListener('scroll', handleScroll);
  //     clearTimeout(scrollTimeout);
  //   };
  // }, [isTarget, targetTransition, phase]);

  // // Combined transition logic (target + non-target)
  // useEffect(() => {
  //   if (isTarget && targetTransition !== 'reset' && !isScrolling) {
  //     // Target: start transition after scroll completes
  //     setPhase('transitioning');
  //     const timer = setTimeout(() => setPhase('centered'), 400);
  //     return () => clearTimeout(timer);
  //   } else if (!isTarget) {
  //     // Non-target: reset immediately when target resets OR follow global phase
  //     if (globalTransitionPhase === 'normal') {
  //       setPhase('normal');
  //     } else {
  //       const delay = globalTransitionPhase === 'transitioning' ? 200 : 0;
  //       const timer = setTimeout(() => setPhase(globalTransitionPhase), delay);
  //       return () => clearTimeout(timer);
  //     }
  //   } else {
  //     setPhase('normal');
  //   }
  // }, [isTarget, targetTransition, isScrolling, globalTransitionPhase]);

  // Enhanced debug display
  const getDebugInfo = () => {
    const parts = [
      `ID: ${sectionId}`,
      `Phase: ${phase}`,
      `Target: ${isTarget}`,
      `Position: ${positionRelativeToTarget}`,
      `TransType: ${targetTransition}`
    ];
    return parts.join(' | ');
  };

  // const getTransformClass = () => {
  //   // // Non-target sections slide based on position
  //   // if (!isTarget && phase === 'centered') {
  //   //   if (positionRelativeToTarget === 'above') {
  //   //     return `${TRANSITIONS.BASE_TRANSITION} transform translate-y-[-100vh]`; // Slide up
  //   //   }
  //   //   if (positionRelativeToTarget === 'below') {
  //   //     return `${TRANSITIONS.BASE_TRANSITION} transform translate-y-[100vh]`; // Slide down
  //   //   }
  //   // }

  //   if (!isTarget && phase === 'centered') {
  //     return `${TRANSITIONS.BASE_TRANSITION} opacity-0`;
  //   }

  //   // Target sections center themselves
  //   if (phase === 'centered' && isTarget) {
  //     switch (targetTransition) {
  //       case 'centerFromTop':
  //         return TRANSITIONS.TARGET_FROM_TOP;
  //       case 'centerFromBottom':
  //         return TRANSITIONS.TARGET_FROM_BOTTOM;
  //       default:
  //         return TRANSITIONS.BASE_TRANSITION;
  //     }
  //   }

  //   return TRANSITIONS.BASE_TRANSITION;
  // };

  const getTransformClass = () => {
    // Stage 1: Non-targets fade out
    if (!isTarget && (phase === 'transitioning' || phase === 'centered')) {
      return `${TRANSITIONS.BASE_TRANSITION} opacity-0`;
    }

    // Stage 2: Only Contact section gets the old centering behavior
    if (phase === 'centered' && isTarget && sectionId === 'contact') {
      switch (targetTransition) {
        case 'centerFromTop':
          return TRANSITIONS.TARGET_FROM_TOP;
        case 'centerFromBottom':
          return TRANSITIONS.TARGET_FROM_BOTTOM;
        default:
          return TRANSITIONS.BASE_TRANSITION;
      }
    }

    return TRANSITIONS.BASE_TRANSITION;
  };

  return (
    <div
      className={`relative ${getTransformClass()} ${phase !== 'normal' ? 'fade-underlay' : ''} ${phase === 'centered' && sectionId === 'contact' ? 'z-50' : ''}`}
    >
      {/* <div className="absolute top-0 left-0 bg-red-500 text-white text-xs p-2 z-50 max-w-xs">
        {getDebugInfo()}
      </div> */}
      {children}
    </div>
  );
}
