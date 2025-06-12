import React from "react";

const projects = [
  {
    title: "AI-Powered Portfolio System",
    description:
      "Serverless RAG application using AWS services, demonstrating advanced retrieval-augmented generation for personalized recruiter experiences.",
    tech: ["Next.js", "AWS Lambda", "PostgreSQL", "PGVector", "AWS Titan"],
    status: "In Development",
    highlights: [
      "Semantic search across professional artifacts",
      "Cost-optimized serverless architecture",
      "AI-generated third-person introductions",
    ],
  },
  {
    title: "SSH Context Manager",
    description:
      "Full-stack e-commerce solution with real-time inventory management and payment processing.",
    tech: ["React", "Node.js", "MongoDB", "Stripe API"],
    status: "Completed",
    highlights: [
      "Real-time inventory updates",
      "Secure payment processing",
      "Admin dashboard",
    ],
  },
  {
    title: "Data Visualization Dashboard",
    description:
      "Interactive dashboard for business intelligence with real-time data streaming.",
    tech: ["D3.js", "Python", "Flask", "WebSocket"],
    status: "Completed",
    highlights: [
      "Real-time data streaming",
      "Interactive visualizations",
      "Custom analytics engine",
    ],
  },
];

function FeaturedProjects() {
  return (
    <>
      <h2 className="text-4xl font-bold text-primary text-center mb-12">
        Featured Projects
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <div
            key={index}
            className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300 hover:transform hover:scale-105"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-primary">
                {project.title}
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  project.status === "In Development"
                    ? "status-badge-dev"
                    : "status-badge-complete"
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-secondary mb-4">{project.description}</p>
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech, techIndex) => (
                  <span
                    key={techIndex}
                    className="px-2 py-1 tech-tag rounded text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <ul className="text-sm text-muted space-y-1">
              {project.highlights.map((highlight, hIndex) => (
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
