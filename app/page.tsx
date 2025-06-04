import React, { useState, useEffect } from "react";
import {
  Github,
  Linkedin,
  Mail,
  ExternalLink,
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
      title: "E-Commerce Platform",
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
    Frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Vue.js"],
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-sm border-b border-purple-500/20 z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-purple-400" />
              <span className="text-xl font-bold text-white">Magnus.dev</span>
            </div>
            <div className="hidden md:flex space-x-8">
              {["about", "projects", "skills", "contact"].map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`capitalize transition-colors ${
                    activeSection === section
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-gray-300 hover:text-white"
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
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Hi, I'm{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Magnus
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Full-Stack Developer & AI Engineer building intelligent systems
              that bridge the gap between data and user experience
            </p>
            <div className="flex justify-center space-x-6 mb-12">
              <a
                href="#"
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Github className="h-5 w-5" />
                <span>View Work</span>
              </a>
              <a
                href="#"
                className="flex items-center space-x-2 border border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white px-6 py-3 rounded-lg transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Ask AI About Me</span>
              </a>
            </div>
          </div>

          {/* AI System Preview */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-3">
                <Bot className="h-6 w-6 text-purple-400" />
                <span className="text-lg font-semibold text-white">
                  AI-Powered Portfolio System
                </span>
                <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  Active
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <Database className="h-8 w-8 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white mb-2">RAG System</h3>
                <p className="text-gray-300 text-sm">
                  Semantic search across CV, GitHub, and project artifacts using
                  PGVector
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <Code className="h-8 w-8 text-green-400 mb-3" />
                <h3 className="font-semibold text-white mb-2">
                  Smart Matching
                </h3>
                <p className="text-gray-300 text-sm">
                  AI generates personalized responses based on job requirements
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <Cloud className="h-8 w-8 text-purple-400 mb-3" />
                <h3 className="font-semibold text-white mb-2">Serverless</h3>
                <p className="text-gray-300 text-sm">
                  Cost-optimized AWS infrastructure with Lambda and RDS
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-16 px-6 bg-slate-800/30">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Featured Projects
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {project.title}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      project.status === "In Development"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="text-gray-300 mb-4">{project.description}</p>
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <ul className="text-sm text-gray-400 space-y-1">
                  {project.highlights.map((highlight, hIndex) => (
                    <li key={hIndex} className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
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
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Technical Skills
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Object.entries(skills).map(([category, skillList]) => (
              <div
                key={category}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  {category}
                </h3>
                <div className="space-y-2">
                  {skillList.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-300">{skill}</span>
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-slate-800/30">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-8">Let's Connect</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Interested in my AI-powered approach to showcasing professional
            experience? Let's discuss how intelligent systems can enhance your
            hiring process.
          </p>
          <div className="flex justify-center space-x-6">
            <a
              href="#"
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Mail className="h-5 w-5" />
              <span>magnus@example.com</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Linkedin className="h-5 w-5" />
              <span>LinkedIn</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-purple-500/20">
        <div className="container mx-auto text-center text-gray-400">
          <p>
            &copy; 2024 Magnus Portfolio. Powered by AI and built with passion.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Portfolio;
