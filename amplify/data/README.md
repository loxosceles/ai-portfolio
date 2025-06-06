# Manage Data Resources in `data` Module

Frontend code examples for working with the portfolio data:

```javascript
// Generate the client
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();
```

```javascript
// Fetch developer info
const { data: developers } = await client.models.Developer.list();
const developer = developers?.[0]; // Assuming single developer portfolio

// Fetch all projects
const { data: projects } = await client.models.Project.list();

// Fetch projects by status
const { data: completedProjects } = await client.models.Project.list({
  filter: { status: { eq: 'Completed' } }
});

// Fetch featured projects
const { data: featuredProjects } = await client.models.Project.list({
  filter: { featured: { eq: true } }
});

// Create a new project
const newProject = await client.models.Project.create({
  title: 'E-commerce Platform',
  description: 'Full-stack e-commerce solution with React and Node.js',
  status: 'Completed',
  highlights: [
    'Implemented secure payment processing',
    'Built responsive admin dashboard',
    'Optimized for mobile devices'
  ],
  tech: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'AWS'],
  githubUrl: 'https://github.com/username/ecommerce-platform',
  liveUrl: 'https://myecommerce.com',
  featured: true,
  developerId: developer?.id
});

// Update project status
const updatedProject = await client.models.Project.update({
  id: 'project-id',
  status: 'Completed'
});
```

```javascript
// Example component usage:
function ProjectsGrid() {
  const { data: projects, isLoading } = await client.models.Project.list({
    filter: { featured: { eq: true } }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects?.map(project => (
        <div key={project.id} className="border rounded-lg p-4">
          <h3 className="text-xl font-bold">{project.title}</h3>
          <p className="text-gray-600">{project.description}</p>
          <div className="mt-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {project.status}
            </span>
          </div>
          <div className="mt-2">
            {project.tech?.map(tech => (
              <span key={tech} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                {tech}
              </span>
            ))}
          </div>
          <ul className="mt-2 text-sm">
            {project.highlights?.map((highlight, index) => (
              <li key={index} className="text-gray-700">• {highlight}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```
