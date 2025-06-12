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

function SkillsSection() {
  return (
    <div className="container mx-auto">
      <h2 className="text-4xl font-bold text-primary text-center mb-12">
        Technical Skills
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.entries(skills).map(([category, skillList]) => (
          <div key={category} className="card-glass rounded-xl p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">
              {category}
            </h3>
            <div className="space-y-2">
              {skillList.map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-secondary">{skill}</span>
                  <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkillsSection;
