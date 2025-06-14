import { DeveloperType } from '@/shared/types';

function FeaturedProjects({ developer }: { developer: DeveloperType }) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log("Developer's project:", developer.projects);
  }
  const { projects } = developer || {};

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center text-muted">
        <p>Error loading projects.</p>
      </div>
    );
  }
  const bla = 1;
  const bla = 2;

  // eslint-disable-next-line no-console
  console.log('bla', bla);

  return (
    <>
      <h2 className="text-4xl font-bold text-primary text-center mb-12">Featured Projects</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <div
            key={index}
            className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300 hover:transform hover:scale-105"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-primary">{project.title}</h3>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  project.status === 'Active' ? 'status-badge-dev' : 'status-badge-complete'
                }
            `}
              >
                {project.status}
              </span>
            </div>
            <p className="text-secondary mb-4">{project.description}</p>
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {project.tech?.map((tech, techIndex) => (
                  <span key={techIndex} className="px-2 py-1 tech-tag rounded text-xs">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1">
              {project.highlights?.map((highlight, hIndex) => (
                <li key={hIndex} className="flex items-start">
                  <span className="text-brand-accent mr-2">•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

export default FeaturedProjects;
