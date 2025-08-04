import { Bot, Code, Database, Cloud } from 'lucide-react';

function ProjectPreview() {
  return (
    <>
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6 text-brand-accent" />
          <span className="text-lg font-semibold text-primary">AI-Powered Portfolio System</span>
          <div className="px-3 py-1 status-badge-dev rounded-full text-sm">Active</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 text-left">
        <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
          <Database className="h-8 w-8 text-status-info mb-3" />
          <h3 className="font-semibold text-primary mb-2">RAG System</h3>
          <p className="text-secondary text-sm">
            Semantic search across CV, GitHub, and project artifacts using PGVector
          </p>
        </div>

        <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
          <Code className="h-8 w-8 text-status-info mb-3" />
          <h3 className="font-semibold text-primary mb-2">Smart Matching</h3>
          <p className="text-secondary text-sm">
            AI generates personalized responses based on job requirements
          </p>
        </div>

        <div className="bg-surface-light bg-opacity-50 rounded-lg p-4">
          <Cloud className="h-8 w-8 text-status-info mb-3" />
          <h3 className="font-semibold text-primary mb-2">Serverless</h3>
          <p className="text-secondary text-sm">
            Cost-optimized AWS infrastructure with Lambda and RDS
          </p>
        </div>
      </div>
    </>
  );
}

export default ProjectPreview;
