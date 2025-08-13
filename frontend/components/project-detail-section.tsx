import React from 'react';
import { ProjectType } from '@/shared/types';
import {
  Github,
  ExternalLink,
  Target,
  Lightbulb,
  Code,
  Layers,
  Zap,
  CheckCircle,
  Wrench
} from 'lucide-react';
import TechBadge from './tech-badge';

interface ProjectDetailSectionProps {
  project: ProjectType;
  id?: string;
  backgroundIndex?: number;
  projectSymbol?: React.ReactNode;
  projectColor?: string;
}

export default function ProjectDetailSection({
  project,
  id,
  backgroundIndex,
  projectSymbol
}: ProjectDetailSectionProps) {
  const backgroundClass =
    backgroundIndex !== undefined && backgroundIndex % 2 === 0 ? 'bg-glass-light' : '';

  return (
    <section id={id} className={`min-h-screen ${backgroundClass} py-16 px-6`}>
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4 flex items-center justify-center">
            {projectSymbol && <span className="mr-3">{projectSymbol}</span>}
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
                <Github className="h-5 w-5" />
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
                <h3 className="text-2xl font-semibold text-primary">Technical Architecture</h3>
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
                    <div key={index} className="text-secondary text-sm">
                      • {perf}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Architecture Patterns & Highlights */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Architecture Patterns</h3>
                <div className="space-y-2">
                  {project.archPatterns?.map((pattern, index) => (
                    <div key={index} className="text-secondary text-sm">
                      • {pattern}
                    </div>
                  ))}
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
