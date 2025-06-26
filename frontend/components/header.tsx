import React from 'react';
import { Bot } from 'lucide-react';
import { DeveloperType } from '@/shared/types';

function Header({ developer }: { developer: DeveloperType }) {
  const { email } = developer;

  const handleSectionClick = (section: string) => {
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="container mx-auto px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-brand-accent" />
          <span className="text-xl font-bold text-primary">{email}</span>
        </div>
        <div className="hidden md:flex space-x-8">
          {['about', 'projects', 'skills', 'contact'].map((section) => (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className="capitalize transition-colors duration-200 pb-1 text-secondary hover:text-primary hover:text-brand-accent"
            >
              {section}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
export default Header;
