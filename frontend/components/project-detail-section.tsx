import React, { useState } from 'react';
import { ProjectType } from '@/shared/types';
import {
  ExternalLink,
  Target,
  Lightbulb,
  Code,
  Layers,
  Zap,
  CheckCircle,
  ChevronRight,
  Wrench,
  GitBranch
} from 'lucide-react';
import TechBadge from './tech-badge';
import ProjectIcon from './project-icon';
import GitHubIcon from './icons/github-icon';
import { useScreenSize } from '@/hooks/useScreenSize';
import MobileSlidingTabs from './mobile-sliding-tabs';
import TabHeader from './tab-header';

interface ProjectDetailSectionProps {
  project: ProjectType;
  id?: string;
  backgroundIndex?: number;
}

export default function ProjectDetailSection({
  project,
  id,
  backgroundIndex
}: ProjectDetailSectionProps) {
  const backgroundClass =
    backgroundIndex !== undefined && backgroundIndex % 2 === 0 ? 'bg-glass-light' : '';

  const repositoryContent = project.repositoryAndDevelopment || {
    plannedFeatures: [
      'Enhanced capabilities',
      'Real-time features',
      'Mobile support',
      'Cloud integration'
    ],
    vision: 'This project continues to evolve with new features and improvements.'
  };

  return (
    <section
      id={id}
      className={`min-h-screen ${backgroundClass} py-16 px-6 ${backgroundClass ? 'xl:max-w-[1400px] xl:mx-auto' : ''}`}
    >
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4 flex items-center justify-center">
            <span className="mr-3 text-status-warning">
              <ProjectIcon project={project} className="h-10 w-10" />
            </span>
            {project.title}
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto mb-8">
            {project.overview || project.description}
          </p>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-6 py-3 rounded-lg flex items-center space-x-2"
              >
                <GitHubIcon className="h-5 w-5" />
                <span>View Code</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline px-6 py-3 rounded-lg flex items-center space-x-2"
              >
                <ExternalLink className="h-5 w-5" />
                <span>Live Demo</span>
              </a>
            )}
          </div>
        </div>

        {project.overview && (
          <div className="space-y-8">
            {/* Challenge & Solution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Target className="h-6 w-6 text-status-warning mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Challenge</h3>
                </div>
                <p className="text-secondary leading-relaxed">{project.challenge}</p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Lightbulb className="h-6 w-6 text-status-warning mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Solution</h3>
                </div>
                <p className="text-secondary leading-relaxed">{project.solution}</p>
              </div>
            </div>

            {/* Technical Architecture */}
            <div className="card-glass rounded-xl p-8">
              <div className="flex items-center mb-6">
                <Layers className="h-6 w-6 text-status-warning mr-3" />
                <h3 className="text-2xl font-semibold text-primary">Architecture</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {project.architecture?.map((arch, index) => (
                  <div key={index} className="border-l-4 border-brand-accent/30 pl-4">
                    <h4 className="text-lg font-medium text-primary mb-2">{arch.name}</h4>
                    <p className="text-secondary text-sm leading-relaxed">{arch.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Showcases */}
            {project.technicalShowcases && project.technicalShowcases.length > 0 && (
              <TechnicalShowcaseTabs showcases={project.technicalShowcases} />
            )}

            {/* Technology Stack & Performance */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Wrench className="h-6 w-6 text-status-warning mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Technology Stack</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.techStack?.map((tech, index) => (
                    <TechBadge key={index} tech={tech} />
                  ))}
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Zap className="h-6 w-6 text-status-warning mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Performance</h3>
                </div>
                <div className="space-y-2">
                  {project.performance?.map((perf, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-status-warning mr-3 mt-0.5 flex-shrink-0">•</span>
                      <span className="text-secondary text-sm">{perf}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Repository & Development & Highlights */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <GitBranch className="h-6 w-6 text-status-warning mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Repository & Development</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full mr-3">
                        Active
                      </span>
                      <span className="text-secondary text-sm">Development Status</span>
                    </div>
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-brand-accent text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors text-xs"
                      >
                        <GitHubIcon className="h-3 w-3 mr-1" />
                        <span>View Repository</span>
                        <ExternalLink className="h-2 w-2 ml-1" />
                      </a>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-primary mb-2">Planned Features</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                      {repositoryContent.plannedFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center">
                          <span className="text-status-warning mr-2 flex-shrink-0">•</span>
                          <span className="text-secondary text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-brand-accent/20 pt-3">
                      <h4 className="text-sm font-medium text-primary mb-2">Development Vision</h4>
                      <p className="text-secondary text-xs leading-relaxed">
                        {repositoryContent.vision}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Project Highlights</h3>
                <div className="space-y-3">
                  {project.highlights?.map((highlight, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-status-warning mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-secondary text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface TechnicalShowcaseTabsProps {
  showcases: { title: string; description: string; highlights: string[] }[];
}

function TechnicalShowcaseTabs({ showcases }: TechnicalShowcaseTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { isMobile } = useScreenSize();

  if (isMobile) {
    return <MobileSlidingTabs showcases={showcases} />;
  }

  return (
    <div className="card-glass rounded-xl p-8">
      <div className="flex items-center mb-6">
        <Code className="h-6 w-6 text-status-warning mr-3" />
        <h3 className="text-2xl font-semibold text-primary">Technical Deep Dive</h3>
      </div>

      <TabHeader showcases={showcases} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="h-96 md:h-[480px] pb-8">
        <div className="mb-8 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-accent scrollbar-track-brand-accent/20">
          <p className="text-secondary leading-relaxed pr-2">{showcases[activeTab].description}</p>
        </div>
        <div className="space-y-3 h-64">
          {showcases[activeTab].highlights.map((highlight, index) => (
            <div key={index} className="flex items-start">
              <ChevronRight className="h-4 w-4 text-status-warning mr-3 mt-1 flex-shrink-0" />
              <span className="text-secondary text-sm">{highlight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
