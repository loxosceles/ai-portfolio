import { DeveloperType, ProjectType } from '@/shared/types';
import { isLocalEnvironment } from '@/lib/auth/auth-utils';
import ProjectIcon from './project-icon';

function ProjectHeader({ project }: { project: ProjectType }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="text-status-warning">
        <ProjectIcon project={project} />
      </div>
      <h3 className="text-xl font-semibold text-primary">{project.title}</h3>
    </div>
  );
}

interface FeaturedProjectsProps {
  id?: string;
  developer: DeveloperType;
  onNavigate?: (sectionId: string) => void;
}

function FeaturedProjects({ id, developer, onNavigate }: FeaturedProjectsProps) {
  if (isLocalEnvironment()) {
    // console.log("Developer's project:", developer.projects);
  }
  const { projects } = developer || {};

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center text-muted">
        <p>Error loading projects.</p>
      </div>
    );
  }

  return (
    <section id={id} className="py-16 px-6 bg-glass-light">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold text-primary text-center mb-12">Featured Projects</h2>
        <div className="grid lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300 hover:transform hover:scale-105 min-h-[400px] grid grid-rows-[auto_1fr_auto]"
            >
              <ProjectHeader project={project} />
              <div className="grid grid-rows-[auto_min-content_1fr]">
                <p className="text-secondary mb-6">{project.description}</p>
                <div className="h-full overflow-y-auto mb-2">
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {project.techStack?.map((tech, techIndex) => (
                      <span key={techIndex} className="px-2 py-1 tech-tag rounded text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <ul className="text-sm text-muted space-y-1 mb-6">
                  {project.highlights?.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-start">
                      <span className="text-status-warning mr-2">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => {
                  onNavigate?.(project.slug);
                  const element = document.querySelector(`#${project.slug}`);
                  if (element) {
                    element.scrollIntoView({ block: 'start', behavior: 'smooth' });
                  }
                }}
                className="px-3 py-1 rounded text-sm border transition-all duration-300 hover:scale-105 text-brand-accent border-current hover:shadow-[0_0_15px_currentColor]"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProjects;
