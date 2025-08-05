import React, { useState } from 'react';
import { Terminal, ChevronDown } from 'lucide-react';
import { DeveloperType, ProjectType } from '@/shared/types';

interface HeaderProps {
  developer: DeveloperType;
  projects?: ProjectType[];
  activeSection?: string;
  onActiveSectionChange?: (sectionId: string) => void;
}

function Header({ developer, projects = [], activeSection, onActiveSectionChange }: HeaderProps) {
  const { email } = developer;
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSectionClick = (section: string) => {
    const sectionId = section === 'about' ? 'hero' : section === 'projects' ? 'featured' : section;
    onActiveSectionChange?.(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleProjectClick = (project: ProjectType) => {
    onActiveSectionChange?.(project.slug);
    document.getElementById(project.slug)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setShowProjectsDropdown(false);
  };

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setShowProjectsDropdown(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowProjectsDropdown(false);
    }, 500);
    setHoverTimeout(timeout);
  };

  return (
    <nav className="container mx-auto px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Terminal className="h-8 w-8 text-brand-accent" />
        </div>
        <div className="hidden md:flex space-x-8">
          <button
            onClick={() => handleSectionClick('about')}
            className={`capitalize transition-colors duration-200 pb-1 hover:text-brand-accent ${
              activeSection === 'hero' ? 'text-brand-accent' : 'text-secondary'
            }`}
          >
            About
          </button>

          <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button
              onClick={() => handleSectionClick('projects')}
              className="capitalize transition-colors duration-200 pb-1 text-secondary hover:text-brand-accent flex items-center space-x-1"
            >
              <span>Projects</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showProjectsDropdown && projects.length > 0 && (
              <div className="absolute top-full left-0 bg-surface-medium bg-opacity-95 backdrop-blur-sm border border-subtle rounded-lg py-2 min-w-48 z-50 shadow-lg">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="block w-full text-left px-4 py-3 text-secondary hover:text-brand-accent hover:bg-surface-light transition-colors"
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSectionClick('skills')}
            className="capitalize transition-colors duration-200 pb-1 text-secondary hover:text-brand-accent"
          >
            Skills
          </button>

          <button
            onClick={() => handleSectionClick('contact')}
            className="capitalize transition-colors duration-200 pb-1 text-secondary hover:text-brand-accent"
          >
            Contact
          </button>
        </div>
      </div>
    </nav>
  );
}
export default Header;
