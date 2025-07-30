'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import { DeveloperType, ProjectType } from '@/shared/types';

interface AutoHideHeaderProps {
  developer: DeveloperType;
  projects: ProjectType[];
}

export default function AutoHideHeader({ developer, projects }: AutoHideHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 100) {
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
      <Header developer={developer} projects={projects} />
    </header>
  );
}
