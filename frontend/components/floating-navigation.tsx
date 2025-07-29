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
}

export default function FloatingNavigation({ projects }: FloatingNavigationProps) {
  const [activeSection, setActiveSection] = useState('hero');
  const [showProjectSubmenu, setShowProjectSubmenu] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const navigationItems: NavigationItem[] = [
    { id: 'hero', label: 'About', icon: <User className="h-4 w-4" />, selector: '#hero' },
    { id: 'skills', label: 'Skills', icon: <Code className="h-4 w-4" />, selector: '#skills' },
    {
      id: 'projects',
      label: 'Projects',
      icon: <Briefcase className="h-4 w-4" />,
      selector: `#${projects[0]?.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')}`
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: <MessageCircle className="h-4 w-4" />,
      selector: '#contact'
    }
  ];

  const projectItems: ProjectNavItem[] = projects.map((project) => {
    const slug = project.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return {
      id: slug,
      label: project.title,
      selector: `#${slug}`
    };
  });

  const scrollToSection = (selector: string) => {
    const element = document.querySelector(selector);
    element?.scrollIntoView({ behavior: 'smooth' });
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

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'hero', element: document.querySelector('#hero') },
        { id: 'skills', element: document.querySelector('#skills') },
        ...projects.map((project) => {
          const slug = project.title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
          return { id: 'projects', element: document.querySelector(`#${slug}`) };
        }),
        { id: 'contact', element: document.querySelector('#contact') }
      ];

      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (const section of sections.reverse()) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementHeight = rect.height;

          // For skills section, use a more generous detection area
          const threshold = section.id === 'skills' ? elementHeight * 0.3 : 0;

          if (scrollPosition >= elementTop - threshold) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [projects]);

  return (
    <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40">
      <div className="flex flex-col space-y-4">
        {navigationItems.map((item) => (
          <div key={item.id} className="relative">
            <button
              onClick={() => scrollToSection(item.selector)}
              onMouseEnter={() => item.id === 'projects' && handleMouseEnter()}
              onMouseLeave={() => item.id === 'projects' && handleMouseLeave()}
              className={`group relative p-3 rounded-full transition-all duration-300 ${
                activeSection === item.id
                  ? 'bg-brand-accent text-white scale-110'
                  : 'bg-surface-medium bg-opacity-80 text-secondary hover:bg-brand-accent hover:text-white hover:scale-105'
              }`}
              title={item.label}
            >
              {item.icon}
              <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-surface-dark text-primary text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </button>

            {/* Project Submenu - Mac-style Arc */}
            {item.id === 'projects' && showProjectSubmenu && (
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
                        onClick={() => scrollToSection(project.selector)}
                        className={`group relative p-3 rounded-full bg-surface-medium bg-opacity-90 text-secondary hover:bg-brand-accent hover:text-white hover:scale-110 transition-all duration-300 transform ${yOffset} shadow-lg backdrop-blur-sm border border-subtle min-w-12 min-h-12 flex items-center justify-center`}
                        title={project.label}
                      >
                        <span className="text-sm font-semibold">{index + 1}</span>
                        <span className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-surface-dark text-primary text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                          {project.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
