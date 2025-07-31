import { DeveloperType } from '@/shared/types';

interface SkillsSectionProps {
  id?: string;
  developer: DeveloperType;
}

function SkillsSection({ id, developer }: SkillsSectionProps) {
  const { skillSets } = developer;

  return (
    <section id={id} className="py-16 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-primary text-center mb-12">Technical Skills</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {skillSets?.map((skillSet) => (
            <div key={skillSet.name} className="card-glass rounded-xl p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">{skillSet.name}</h3>
              <div className="space-y-2">
                {skillSet.skills.map((skill) => (
                  <div key={skill} className="flex items-center justify-between">
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
  );
}

export default SkillsSection;
