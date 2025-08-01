import React from 'react';
import { ProjectType } from '@/shared/types';
import { Github, ExternalLink } from 'lucide-react';

interface ProjectDetailSectionProps {
  project: ProjectType;
  content: string;
  id?: string;
  backgroundIndex?: number;
}

export default function ProjectDetailSection({
  project,
  content,
  id,
  backgroundIndex
}: ProjectDetailSectionProps) {
  const backgroundClass =
    backgroundIndex !== undefined && backgroundIndex % 2 === 0 ? 'bg-glass-light' : '';

  return (
    <section id={id} className={`min-h-screen ${backgroundClass} py-16 px-6`}>
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">{project.title}</h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">{project.description}</p>
        </div>

        <div className="flex justify-center gap-4 mb-12">
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

        <div className="card-glass rounded-xl p-8">
          <div className="prose prose-invert max-w-none">
            <div
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/^# /gm, '<h3 class="text-2xl font-bold text-primary mb-4">')
                  .replace(/^## /gm, '<h4 class="text-xl font-semibold text-primary mb-3 mt-6">')
                  .replace(/^### /gm, '<h5 class="text-lg font-medium text-primary mb-2 mt-4">')
                  .replace(/^\*\*(.*?)\*\*/gm, '<strong class="text-primary">$1</strong>')
                  .replace(/^- /gm, '<li class="text-secondary mb-1">• ')
                  .replace(/\n\n/g, '</p><p class="text-secondary mb-4">')
                  .replace(/^(?!<[h|l|s])/gm, '<p class="text-secondary mb-4">')
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
