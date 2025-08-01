'use client';

import React, { useEffect, useState } from 'react';
import HeroSection from '@/components/hero-section';
import FeaturedProjects from '@/components/featured-projects';
import SkillsSection from '@/components/skills-section';
import ContactSection from '@/components/contact-section';
import Footer from '@/components/footer';
import { setDevelopmentCookies } from '@/utils/dev-cookies';
import { GET_DEVELOPER_WITH_PROJECTS } from '@/queries/developers';
import { useQuery } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { cookieAuth } from '@/lib/auth/cookie-auth';
import { isLocalEnvironment } from '@/lib/auth/auth-utils';
import ProjectDetailSection from '@/components/project-detail-section';
import { getProjectDetail } from '@/lib/projects/project-details';
import FloatingNavigation from '@/components/floating-navigation';
import AutoHideHeader from '@/components/auto-hide-header';
import TransitionManager from '@/components/transition-manager';
import { ProjectType, DeveloperType } from '@/shared/types';

interface SectionConfig {
  id: string;
  targetTransition: 'reset' | 'centerFromBottom' | 'centerFromTop';
  component: (developer: DeveloperType) => React.ReactNode;
}

// Section configuration - defines order, transition behavior, and components
const SECTIONS_CONFIG: SectionConfig[] = [
  {
    id: 'hero',
    targetTransition: 'reset',
    component: (developer: DeveloperType) => <HeroSection developer={developer} />
  },
  {
    id: 'featured',
    targetTransition: 'centerFromBottom', // slideDown becomes centerFromBottom
    component: (developer: DeveloperType) => <FeaturedProjects developer={developer} />
  },
  {
    id: 'skills',
    targetTransition: 'centerFromBottom',
    component: (developer: DeveloperType) => <SkillsSection developer={developer} />
  },
  {
    id: 'ai-portfolio',
    targetTransition: 'centerFromBottom',
    component: (developer: DeveloperType) => (
      <ProjectDetailSection
        project={
          developer.projects?.[0] ||
          ({
            id: 'ai-portfolio',
            title: 'AI Portfolio',
            slug: 'ai-portfolio',
            description: 'Default project',
            status: 'active',
            developer: developer,
            developerId: developer.id || 'default-dev'
          } as unknown as ProjectType)
        }
        content={
          getProjectDetail('ai-portfolio')?.content ||
          `# AI Portfolio\n\n## Project Overview\n\nDefault project content`
        }
        id="ai-portfolio"
      />
    )
  },
  {
    id: 'contact',
    targetTransition: 'centerFromTop', // slideUp becomes centerFromTop
    component: (developer: DeveloperType) => <ContactSection developer={developer} />
  }
];

const Portfolio = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [targetSection, setTargetSection] = useState('hero');
  const [scrollSection, setScrollSection] = useState('hero');
  const [isNavigating, setIsNavigating] = useState(false);
  const { getQueryContext } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (isNavigating) return;

      // Check if at bottom of page
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        setScrollSection('contact');
        return;
      }

      const sections = ['hero', 'featured', 'skills', 'ai-portfolio', 'contact'];
      const viewportCenter = window.innerHeight / 2;
      let closestSection = 'hero';
      let closestDistance = Infinity;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestSection = sectionId;
          }
        }
      }

      setScrollSection(closestSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isNavigating]);

  const handleNavigation = (sectionId: string) => {
    setIsNavigating(true);
    setTargetSection(sectionId);
    setTimeout(() => {
      setScrollSection(sectionId);
      setIsNavigating(false);
    }, 1000);
  };

  const activeSection = isNavigating ? targetSection : scrollSection;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const visitorQParam = params.get('visitor');

    if (isLocalEnvironment() && visitorQParam) {
      // Set cookies directly in local development
      // eslint-disable-next-line no-console
      console.log('Setting development cookies for visitor:', visitorQParam);
      setDevelopmentCookies(visitorQParam);
    } else if (!visitorQParam) {
      // Clean up all authentication cookies if no visitor parameter
      cookieAuth.clearTokens();
    }

    setIsChecking(false);
  }, []);

  const { loading, error, data } = useQuery(GET_DEVELOPER_WITH_PROJECTS, {
    context: getQueryContext('public'),
    onCompleted: (data: { getDeveloper: { name: string } }) => {},
    onError: (error: Error) => {
      console.error('Query error:', error);
    }
  });

  // Show loading state if either checking cookies or loading data
  if (isChecking || loading) {
    return <div>Loading...</div>;
  }

  if (error) return <div>Error: {error.message}</div>;

  const developer = data?.getDeveloper || {};

  return (
    <>
      <FloatingNavigation
        projects={developer.projects || []}
        activeSection={activeSection}
        onActiveSectionChange={handleNavigation}
      />
      <AutoHideHeader
        developer={developer}
        projects={developer.projects || []}
        onActiveSectionChange={handleNavigation}
      />
      <div className="min-h-screen gradient-bg pt-20 overscroll-none contain-layout md:px-20">
        {/* {(isLocalEnvironment() || getEnvironment() === 'dev') && <AuthDebug />} */}

        <TransitionManager targetSection={targetSection}>
          <HeroSection id="hero" developer={developer} />
          <FeaturedProjects id="featured" developer={developer} />
          <SkillsSection id="skills" developer={developer} />
          <ProjectDetailSection
            id="ai-portfolio"
            project={
              developer.projects?.[0] ||
              ({
                id: 'ai-portfolio',
                title: 'AI Portfolio',
                slug: 'ai-portfolio',
                description: 'Default project',
                status: 'active',
                developer: developer,
                developerId: developer.id || 'default-dev'
              } as unknown as ProjectType)
            }
            content={
              getProjectDetail('ai-portfolio')?.content ||
              `# AI Portfolio\n\n## Project Overview\n\nDefault project content`
            }
          />
          <ContactSection id="contact" developer={developer} />
        </TransitionManager>

        <Footer developer={developer} />
      </div>
    </>
  );
};

export default Portfolio;

// return (
//   <div className="min-h-screen gradient-bg pt-20">
//     {/* {(isLocalEnvironment() || getEnvironment() === 'dev') && <AuthDebug />} */}
//     <FloatingNavigation
//       projects={developer.projects || []}
//       activeSection={targetSection}
//       onActiveSectionChange={setTargetSection}
//     />
//     <AutoHideHeader
//       developer={developer}
//       projects={developer.projects || []}
//       onActiveSectionChange={setTargetSection}
//     />

//     {/* Hero Section */}
//     <TransitionManager
//       sectionId="hero"
//       isTarget={targetSection === 'hero'}
//       transitionType="reset"
//       globalTransitionPhase={globalTransitionPhase}
//     >
//       <HeroSection developer={developer} />
//     </TransitionManager>

//     {/* Projects Section */}
//     <TransitionManager
//       sectionId="featured"
//       isTarget={targetSection === 'featured'}
//       transitionType="slideDown"
//       globalTransitionPhase={globalTransitionPhase}
//     >
//       <FeaturedProjects developer={developer} />
//     </TransitionManager>

//     {/* Skills Section */}
//     <TransitionManager
//       sectionId="skills"
//       isTarget={targetSection === 'skills'}
//       transitionType="slideDown"
//       globalTransitionPhase={globalTransitionPhase}
//     >
//       <SkillsSection developer={developer} />
//     </TransitionManager>

//     {/* Project Detail Sections
//     {developer.projects?.map((project: ProjectType) => {
//       const projectSlug = project.slug;
//       const projectDetail = getProjectDetail(projectSlug);

//       return projectDetail ? (
//         <TransitionManager
//           key={project.id}
//           sectionId={projectSlug}
//           isTarget={targetSection === projectSlug}
//           transitionType="slideDown"
//         >
//           <ProjectDetailSection
//             project={project}
//             content={projectDetail.content}
//             id={projectSlug}
//           />
//         </TransitionManager>
//       ) : (
//         <TransitionManager
//           key={project.id}
//           sectionId={projectSlug}
//           isTarget={targetSection === projectSlug}
//           transitionType="slideDown"
//         >
//           <ProjectDetailSection
//             project={project}
//             content={`# ${project.title}\n\n## Project Overview\n\n${project.description}\n\n## Key Highlights\n\n${project.highlights?.map((h) => `- ${h}`).join('\n') || 'No highlights available'}`}
//             id={projectSlug}
//           />
//         </TransitionManager>
//       );
//     })}
//     {!developer.projects?.length && (
//       <section className="min-h-screen bg-glass-light py-16 px-6">
//         <div className="container mx-auto max-w-4xl text-center">
//           <h2 className="text-4xl font-bold text-primary mb-4">No Projects Found</h2>
//           <p className="text-secondary">Projects are loading...</p>
//         </div>
//       </section>
//     )} */}
//     {/* Single Hard-coded Project */}
//     <TransitionManager
//       key="ai-portfolio"
//       sectionId="ai-portfolio"
//       isTarget={targetSection === 'ai-portfolio'}
//       transitionType="slideDown"
//       globalTransitionPhase={globalTransitionPhase}
//     >
//       <ProjectDetailSection
//         project={
//           developer.projects?.[0] || {
//             id: 'ai-portfolio',
//             title: 'AI Portfolio',
//             slug: 'ai-portfolio',
//             description: 'Default project'
//           }
//         }
//         content={
//           getProjectDetail('ai-portfolio')?.content ||
//           `# AI Portfolio\n\n## Project Overview\n\nDefault project content`
//         }
//         id="ai-portfolio"
//       />
//     </TransitionManager>
//     <TransitionManager
//       sectionId="contact"
//       isTarget={targetSection === 'contact'}
//       transitionType="slideUp"
//       globalTransitionPhase={globalTransitionPhase}
//     >
//       <ContactSection developer={developer} />
//     </TransitionManager>

//     {/* Footer */}
//     <footer className="py-8 px-6 border-t border-subtle">
//       <Footer developer={developer} />
//     </footer>
//   </div>
// );
