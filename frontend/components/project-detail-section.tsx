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
  CheckCircle
} from 'lucide-react';
import TechBadge from './tech-badge';
import { getProjectDetail } from '@/lib/projects/project-details';

interface ProjectDetailSectionProps {
  project: ProjectType;
  id?: string;
  backgroundIndex?: number;
  projectSymbol?: string;
  projectColor?: string;
}

export default function ProjectDetailSection({
  project,
  id,
  backgroundIndex,
  projectSymbol,
  projectColor
}: ProjectDetailSectionProps) {
  const backgroundClass =
    backgroundIndex !== undefined && backgroundIndex % 2 === 0 ? 'bg-glass-light' : '';

  const projectDetail = getProjectDetail(project.slug);

  return (
    <section id={id} className={`min-h-screen ${backgroundClass} py-16 px-6`}>
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            {projectSymbol && (
              <span className={`mr-3 text-3xl ${projectColor}`}>{projectSymbol}</span>
            )}
            {projectDetail?.title || project.title}
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto mb-8">
            {projectDetail?.overview || project.description}
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

        {projectDetail && (
          <div className="space-y-8">
            {/* Challenge & Solution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Target className="h-6 w-6 text-orange-400 mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Challenge</h3>
                </div>
                <p className="text-secondary leading-relaxed">{projectDetail.challenge}</p>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Lightbulb className="h-6 w-6 text-project-tertiary mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Solution</h3>
                </div>
                <p className="text-secondary leading-relaxed">{projectDetail.solution}</p>
              </div>
            </div>

            {/* Technical Architecture */}
            <div className="card-glass rounded-xl p-8">
              <div className="flex items-center mb-6">
                <Layers className="h-6 w-6 text-primary mr-3" />
                <h3 className="text-2xl font-semibold text-primary">Technical Architecture</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {projectDetail.architecture.map((arch, index) => (
                  <div key={index} className="border-l-4 border-primary/30 pl-4">
                    <h4 className="text-lg font-medium text-primary mb-2">{arch.component}</h4>
                    <p className="text-secondary text-sm leading-relaxed">{arch.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Example */}
            <div className="card-glass rounded-xl p-8">
              <div className="flex items-center mb-6">
                <Code className="h-6 w-6 text-primary mr-3" />
                <h3 className="text-2xl font-semibold text-primary">
                  {projectDetail.codeExample.title}
                </h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{projectDetail.codeExample.code}</code>
                </pre>
              </div>
            </div>

            {/* Technology Stack & Performance */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Technology Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {projectDetail.techStack.map((tech, index) => (
                    <TechBadge key={index} tech={tech} />
                  ))}
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <Zap className="h-6 w-6 text-yellow-400 mr-3" />
                  <h3 className="text-xl font-semibold text-primary">Performance</h3>
                </div>
                <div className="space-y-2">
                  {projectDetail.performance.map((perf, index) => (
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
                  {projectDetail.patterns.map((pattern, index) => (
                    <div key={index} className="text-secondary text-sm">
                      • {pattern}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Project Highlights</h3>
                <div className="space-y-3">
                  {projectDetail.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
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
