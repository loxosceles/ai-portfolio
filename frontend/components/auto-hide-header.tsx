'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import { DeveloperType, ProjectType } from '@/shared/types';
import { NAVIGATION_SWITCH_SCROLL_THRESHOLD } from '@/shared/constants';

interface AutoHideHeaderProps {
  developer: DeveloperType;
  projects: ProjectType[];
  activeSection?: string;
  onActiveSectionChange?: (sectionId: string) => void;
}

export default function AutoHideHeader({
  developer,
  projects,
  activeSection,
  onActiveSectionChange
}: AutoHideHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < NAVIGATION_SWITCH_SCROLL_THRESHOLD) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full bg-surface-medium bg-opacity-80 backdrop-blur-sm border-b border-subtle z-50 transition-transform duration-300 ${
        isVisible ? 'transform translate-y-0' : 'transform -translate-y-full'
      }`}
    >
      <Header
        developer={developer}
        projects={projects}
        activeSection={activeSection}
        onActiveSectionChange={onActiveSectionChange}
      />
    </header>
  );
}
