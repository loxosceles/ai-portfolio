import React, { useState } from 'react';
import Link from 'next/link';
import ProjectPreview from '@/components/project-preview';
import { MessageCircle } from 'lucide-react';
import IconWrapper from '@/components/icon-wrapper';
import { DeveloperType } from '@/shared/types';
import AIQuestion from '@/components/ai-question';

function HeroSection({ developer }: { developer: DeveloperType }) {
  const [showAIQuestion, setShowAIQuestion] = useState(false);
  const { name } = developer;
  const firstName = name.split(' ')[0];

  return (
    <div className="container mx-auto text-center">
      <div className="transform transition-all duration-1000 translate-y-0 opacity-100 animate-fadeIn">
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6">
          Hi, I&apos;m <span className="text-brand-accent">{firstName}</span>
        </h1>
        <p className="text-xl md:text-2xl text-secondary mb-8 max-w-3xl mx-auto">
          Full-Stack Developer & AI Engineer building intelligent systems that bridge the gap
          between data and user experience
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
          <Link href="#" className="flex items-center space-x-2 btn-primary px-6 py-3 rounded-lg">
            <IconWrapper icon="github" className="h-5 w-5" />
            <span>View Work</span>
          </Link>
          <button
            onClick={() => setShowAIQuestion(!showAIQuestion)}
            className="flex items-center space-x-2 btn-outline px-6 py-3 rounded-lg"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Ask AI About Me</span>
          </button>
        </div>
      </div>
      {/* AI Question Modal */}
      {showAIQuestion && <AIQuestion onClose={() => setShowAIQuestion(false)} />}

      {/* AI System Preview */}
      <ProjectPreview />
    </div>
  );
}

export default HeroSection;
