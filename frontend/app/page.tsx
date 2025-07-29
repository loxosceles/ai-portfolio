'use client';

import React, { useEffect, useState } from 'react';
import HeroSection from '@/components/hero-section';
import FeaturedProjects from '@/components/featured-projects';
import SkillsSection from '@/components/skills-section';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { setDevelopmentCookies } from '@/utils/dev-cookies';
import MainContent from '@/components/main-content';
import AuthDebug from '@/components/auth-debug';
import { GET_DEVELOPER_WITH_PROJECTS } from '@/queries/developers';
import { useQuery } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { cookieAuth } from '@/lib/auth/cookie-auth';
import { isLocalEnvironment, getEnvironment } from '@/lib/auth/auth-utils';
import ProjectDetailSection from '@/components/project-detail-section';
import { getProjectDetail } from '@/lib/projects/project-details';
import FloatingNavigation from '@/components/floating-navigation';
import AutoHideHeader from '@/components/auto-hide-header';

const Portfolio = () => {
  const [isChecking, setIsChecking] = useState(true);
  const { getQueryContext } = useAuth();

  const { loading, error, data } = useQuery(GET_DEVELOPER_WITH_PROJECTS, {
    context: getQueryContext('public'),
    onCompleted: (data: { getDeveloper: { name: string } }) => {
      if (isLocalEnvironment()) {
        // eslint-disable-next-line no-console
        console.log('Developer data:', data);
      }
    },
    onError: (error: Error) => {
      console.error('Query error:', error);
    }
  });

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

  // Show loading state if either checking cookies or loading data
  if (isChecking || loading) {
    return <div>Loading...</div>;
  }

  if (error) return <div>Error: {error.message}</div>;

  const developer = data?.getDeveloper || {};

  return (
    <div className="min-h-screen gradient-bg">
      {/* {(isLocalEnvironment() || getEnvironment() === 'dev') && <AuthDebug />} */}
      <FloatingNavigation projects={developer.projects || []} />
      <AutoHideHeader developer={developer} projects={developer.projects || []} />

      {/* Hero Section */}
      <section id="hero" className="pt-16 pb-16 px-6">
        <HeroSection developer={developer} />
      </section>

      {/* Projects Section */}
      <section id="featured" className="py-16 px-6 bg-glass-light">
        <div className="container mx-auto">
          <FeaturedProjects developer={developer} />
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-16 px-6">
        <SkillsSection developer={developer} />
      </section>

      {/* Project Detail Sections */}
      {developer.projects?.map((project, index) => {
        const projectSlug = project.title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        const projectDetail = getProjectDetail(projectSlug);

        if (isLocalEnvironment()) {
          console.log(
            'Project:',
            project.title,
            'Slug:',
            projectSlug,
            'Detail found:',
            !!projectDetail
          );
        }

        return projectDetail ? (
          <ProjectDetailSection
            key={project.id}
            project={project}
            content={projectDetail.content}
            id={projectSlug}
          />
        ) : (
          <ProjectDetailSection
            key={project.id}
            project={project}
            content={`# ${project.title}\n\n## Project Overview\n\n${project.description}\n\n## Key Highlights\n\n${project.highlights?.map((h) => `- ${h}`).join('\n') || 'No highlights available'}`}
            id={projectSlug}
          />
        );
      })}

      {!developer.projects?.length && (
        <section className="min-h-screen bg-glass-light py-16 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold text-primary mb-4">No Projects Found</h2>
            <p className="text-secondary">Projects are loading...</p>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" className="py-16 px-6 bg-glass-light">
        <MainContent developer={developer} />
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-subtle">
        <Footer developer={developer} />
      </footer>
    </div>
  );
};

export default Portfolio;
