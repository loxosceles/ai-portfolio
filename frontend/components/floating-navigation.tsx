'use client';

import React, { useState, useEffect } from 'react';
import { User, Code, MessageCircle, Briefcase } from 'lucide-react';
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
  BASE: 'group relative p-3 rounded-full transition-all duration-300',
  PROJECT:
    'group relative p-2 rounded-full transition-all duration-300 w-10 h-10 flex items-center justify-center'
} as const;

const TOOLTIP_STYLES = {
  VISIBLE: 'opacity-0 group-hover:opacity-100',
  HIDDEN: 'opacity-0',
  BASE: 'absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-surface-dark text-primary text-sm rounded transition-opacity whitespace-nowrap pointer-events-none z-50'
} as const;

export default function FloatingNavigation({
  projects,
  activeSection,
  onActiveSectionChange
}: FloatingNavigationProps) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderVisible(window.scrollY < 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const projectItems: ProjectNavItem[] =
    projects.length > 0
      ? projects.map((project) => ({
          id: project.slug,
          label: project.title,
          selector: `#${project.slug}`
        }))
      : [
          { id: 'ai-portfolio', label: 'AI Portfolio', selector: '#ai-portfolio' },
          { id: 'test-project', label: 'Test Project', selector: '#test-project' }
        ];

  const navigationItems: NavigationItem[] = [
    { id: 'hero', label: 'About', icon: <User className="h-4 w-4" />, selector: '#hero' },
    {
      id: 'projects',
      label: 'Projects',
      icon: <Briefcase className="h-4 w-4" />,
      selector: '#featured'
    },
    { id: 'skills', label: 'Skills', icon: <Code className="h-4 w-4" />, selector: '#skills' },
    ...projectItems.map((project, index) => {
      const projectSymbols = ['◆', '◆', '◆'];
      const projectColors = ['text-orange-400', 'text-pink-400', 'text-cyan-400'];
      return {
        id: project.id,
        label: project.label,
        icon: (
          <span className={`text-xl ${projectColors[index % projectColors.length]}`}>
            {projectSymbols[index % projectSymbols.length]}
          </span>
        ),
        selector: project.selector
      };
    }),
    {
      id: 'contact',
      label: 'Contact',
      icon: <MessageCircle className="h-4 w-4" />,
      selector: '#contact'
    }
  ];

  // Helper functions
  function isActiveItem(
    itemId: string,
    activeSection: string,
    projectItems: ProjectNavItem[]
  ): boolean {
    if (itemId === 'projects') {
      // Projects button is active for featured section OR any individual project section
      return activeSection === 'featured' || projectItems.some((p) => p.id === activeSection);
    }
    return activeSection === itemId;
  }

  function getButtonClassName(itemId: string, activeSection: string): string {
    const isActive = isActiveItem(itemId, activeSection, projectItems);
    const stateClass = isActive ? BUTTON_STYLES.ACTIVE : BUTTON_STYLES.INACTIVE;
    const isProjectItem = projectItems.some((p) => p.id === itemId);
    const baseClass = isProjectItem ? BUTTON_STYLES.PROJECT : BUTTON_STYLES.BASE;
    return `${baseClass} ${stateClass}`;
  }

  function getTooltipClassName(): string {
    return `${TOOLTIP_STYLES.BASE} ${TOOLTIP_STYLES.VISIBLE}`;
  }
  const scrollToSection = (sectionId: string) => {
    onActiveSectionChange?.(sectionId);

    const element = document.querySelector(`#${sectionId}`);
    if (element) {
      const isProjectSection = projectItems.some((p) => p.id === sectionId);
      const scrollBehavior = isProjectSection ? 'start' : 'center';
      element.scrollIntoView({ block: scrollBehavior, behavior: 'smooth' });
    }
  };

  if (isHeaderVisible) {
    return null;
  }

  return (
    <div className="fixed right-6 top-[50vh] transform -translate-y-1/2 z-40 hidden md:block">
      <div className="flex flex-col space-y-4">
        {navigationItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => scrollToSection(item.id === 'projects' ? 'featured' : item.id)}
              className={getButtonClassName(item.id, activeSection)}
              title={item.label}
            >
              {item.icon}
              <span className={getTooltipClassName()}>{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
