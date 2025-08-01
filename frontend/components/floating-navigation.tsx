'use client';

import React, { useState, useEffect } from 'react';
import { User, Code, MessageCircle, Briefcase, Projector } from 'lucide-react';
import { ProjectType } from '@/shared/types';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  selector: string;
}

interface ProjectNavItem {
  id: string;
  label: string;
  selector: string;
}

interface FloatingNavigationProps {
  projects: ProjectType[];
  activeSection: string;
  onActiveSectionChange?: (sectionId: string) => void;
}

// CSS class constants
const BUTTON_STYLES = {
  ACTIVE: 'bg-brand-accent text-white scale-110',
  INACTIVE:
    'bg-surface-medium bg-opacity-80 text-secondary hover:bg-brand-accent hover:text-white hover:scale-105',
  BASE: 'group relative p-3 rounded-full transition-all duration-300'
} as const;

const TOOLTIP_STYLES = {
  VISIBLE: 'opacity-0 group-hover:opacity-100',
  HIDDEN: 'opacity-0',
  BASE: 'absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-surface-dark text-primary text-sm rounded transition-opacity whitespace-nowrap pointer-events-none z-50'
} as const;

// Helper functions
const isActiveItem = (itemId: string, activeSection: string): boolean => {
  return activeSection === itemId;
};

export default function FloatingNavigation({
  projects,
  activeSection,
  onActiveSectionChange
}: FloatingNavigationProps) {
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderVisible(window.scrollY < 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems: NavigationItem[] = [
    { id: 'hero', label: 'About', icon: <User className="h-4 w-4" />, selector: '#hero' },
    {
      id: 'featured',
      label: 'Projects',
      icon: <Briefcase className="h-4 w-4" />,
      selector: '#featured'
    },
    { id: 'skills', label: 'Skills', icon: <Code className="h-4 w-4" />, selector: '#skills' },
    {
      id: 'ai-portfolio',
      label: 'AI Portfolio',
      icon: <Projector className="h-4 w-4" />,
      selector: '#ai-portfolio'
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: <MessageCircle className="h-4 w-4" />,
      selector: '#contact'
    }
  ];

  // const projectItems: ProjectNavItem[] = projects.map((project) => ({
  //   id: project.slug,
  //   label: project.title,
  //   selector: `#${project.slug}`
  // }));

  // Helper functions
  function isActiveItem(itemId: string, activeSection: string): boolean {
    return activeSection === itemId;
  }

  function getButtonClassName(itemId: string, activeSection: string): string {
    const isActive = isActiveItem(itemId, activeSection);
    const stateClass = isActive ? BUTTON_STYLES.ACTIVE : BUTTON_STYLES.INACTIVE;
    return `${BUTTON_STYLES.BASE} ${stateClass}`;
  }

  function getTooltipClassName(itemId: string, showProjectSubmenu: boolean): string {
    const shouldHide = itemId === 'featured' && showProjectSubmenu;
    const visibilityClass = shouldHide ? TOOLTIP_STYLES.HIDDEN : TOOLTIP_STYLES.VISIBLE;
    return `${TOOLTIP_STYLES.BASE} ${visibilityClass}`;
  }
  const scrollToSection = (sectionId: string) => {
    onActiveSectionChange?.(sectionId); // Set state FIRST

    const element = document.querySelector(`#${sectionId}`);
    if (element) {
      // element.scrollIntoView({ behavior: 'smooth' });
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setShowProjectSubmenu(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowProjectSubmenu(false);
    }, 300);
    setHoverTimeout(timeout);
  };

  // const isProjectSection = (sectionId: string) => {
  //   return projects.some((project) => project.slug === sectionId);
  // };

  if (isHeaderVisible) {
    return null;
  }

  return (
    <div
      className={`fixed right-6 top-[50vh] transform -translate-y-1/2 z-40 hidden md:block transition-opacity duration-300 ${
        isHovered ? 'opacity-100' : 'opacity-30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col space-y-4">
        {navigationItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => scrollToSection(item.id)}
              className={getButtonClassName(item.id, activeSection)}
              title={item.label}
            >
              {item.icon}
              <span className={getTooltipClassName(item.id, showProjectSubmenu)}>{item.label}</span>
            </button>
            {/* Project Submenu - Mac-style Arc */}
            {/* {item.id === 'featured' && showProjectSubmenu && (
              <div
                className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex flex-row space-x-3 items-end pb-2">
                  {projectItems.map((project, index) => {
                    const yOffset =
                      index === 1
                        ? '-translate-y-2'
                        : index === 0 || index === 2
                          ? 'translate-y-1'
                          : '';
                    return (
                      <button
                        key={project.id}
                        onClick={() => {
                          onActiveSectionChange?.(project.id); // Set to specific project
                          scrollToSection(project.id);
                        }}
                        className={`group relative p-3 rounded-full bg-surface-medium bg-opacity-90 text-secondary hover:bg-brand-accent hover:text-white hover:scale-110 transition-all duration-300 transform ${yOffset} shadow-lg backdrop-blur-sm border border-subtle min-w-12 min-h-12 flex items-center justify-center`}
                        title={project.label}
                      >
                        <span className="text-sm font-semibold">{index + 1}</span>
                        <span className="absolute top-full mt-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-surface-dark text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none z-50">
                          {project.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )} */}
          </div>
        ))}
      </div>
    </div>
  );
}
