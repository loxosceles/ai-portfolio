import React from 'react';

interface TabHeaderProps {
  showcases: { title: string }[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export default function TabHeader({ showcases, activeTab, onTabChange }: TabHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-6 border-b border-brand-accent/20 pb-2">
      {showcases.map((showcase, index) => (
        <button
          key={index}
          onClick={() => onTabChange(index)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === index
              ? 'bg-brand-accent/20 text-primary border border-brand-accent'
              : 'text-secondary hover:text-primary hover:bg-brand-accent/10'
          }`}
        >
          {showcase.title}
        </button>
      ))}
    </div>
  );
}
