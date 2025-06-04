"use client";
import React, { useState, useEffect } from "react";
import {
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  Bot,
  Code,
  Database,
  Cloud,
} from "lucide-react";

const Portfolio = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState("about");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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

  const skills = {
    Frontend: [
      "React",
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Cypress Testing",
    ],
    Backend: ["Node.js", "Python", "AWS Lambda", "API Gateway", "PostgreSQL"],
    "AI/ML": [
      "RAG Systems",
      "Vector Databases",
      "LangChain",
      "AWS Bedrock",
      "Semantic Search",
    ],
    Cloud: ["AWS", "Serverless", "Docker", "CI/CD", "Infrastructure as Code"],
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="fixed top-0 w-full bg-surface-medium bg-opacity-80 backdrop-blur-sm border-b border-subtle z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-brand-accent" />
              <span className="text-xl font-bold text-primary">
                dev@loxosceles.me
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              {["about", "projects", "skills", "contact"].map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`capitalize transition-colors duration-200 pb-1 ${
                    activeSection === section
                      ? "text-brand-accent border-b-2 border-brand-accent"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="container mx-auto text-center">
          <div
            className={`transform transition-all duration-1000 ${
              isLoaded
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6">
              Hi, I&apos;m <span className="text-brand-accent">Magnus</span>
            </h1>
            <p className="text-xl md:text-2xl text-secondary mb-8 max-w-3xl mx-auto">
              Full-Stack Developer & AI Engineer building intelligent systems
              that bridge the gap between data and user experience
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <a
                href="#"
                className="flex items-center space-x-2 btn-primary px-6 py-3 rounded-lg"
              >
                <Github className="h-5 w-5" />
                <span>View Work</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 btn-outline px-6 py-3 rounded-lg"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Ask AI About Me</span>
              </a>
            </div>
          </div>

          {/* AI System Preview */}
          <div className="card-glass rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-3">
                <Bot className="h-6 w-6 text-brand-accent" />
                <span className="text-lg font-semibold text-primary">
                  AI-Powered Portfolio System
                </span>
                <div className="px-3 py-1 status-badge-complete rounded-full text-sm">
                  Active
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
                <Database className="h-8 w-8 text-status-info mb-3" />
                <h3 className="font-semibold text-primary mb-2">RAG System</h3>
                <p className="text-secondary text-sm">
                  Semantic search across CV, GitHub, and project artifacts using
                  PGVector
                </p>
              </div>
              <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
                <Code className="h-8 w-8 text-status-success mb-3" />
                <h3 className="font-semibold text-primary mb-2">
                  Smart Matching
                </h3>
                <p className="text-secondary text-sm">
                  AI generates personalized responses based on job requirements
                </p>
              </div>
              <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
                <Cloud className="h-8 w-8 text-brand-accent mb-3" />
                <h3 className="font-semibold text-primary mb-2">Serverless</h3>
                <p className="text-secondary text-sm">
                  Cost-optimized AWS infrastructure with Lambda and RDS
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-16 px-6 bg-glass-light">
        <div className="container mx-auto">
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
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">
            Technical Skills
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Object.entries(skills).map(([category, skillList]) => (
              <div
                key={category}
                className="card-glass rounded-xl p-6"
              >
                <h3 className="text-xl font-semibold text-primary mb-4">
                  {category}
                </h3>
                <div className="space-y-2">
                  {skillList.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-secondary">{skill}</span>
                      <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-glass-light">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-primary mb-8">Let&apos;s Connect</h2>
          <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
            Interested in my AI-powered approach to showcasing professional
            experience? Let&apos;s discuss how intelligent systems can enhance your
            hiring process.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <a
              href="mailto:magnus@example.com"
              className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <Mail className="h-5 w-5" />
              <span>magnus@example.com</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <Linkedin className="h-5 w-5" />
              <span>LinkedIn</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-subtle">
        <div className="container mx-auto text-center text-muted">
          <p>
            &copy; 2025 Magnus Portfolio. Powered by AI and built with passion.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Portfolio;