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
import FloatingNavigation from '@/components/floating-navigation';
import AutoHideHeader from '@/components/auto-hide-header';
import TransitionManager from '@/components/transition-manager';
import { ProjectType } from '@/shared/types';

// Helper function to generate section list dynamically
const generateSectionList = (projects: ProjectType[] = []): string[] => {
  const baseSections = ['hero', 'featured', 'skills'];
  const projectSections =
    projects.length > 0
      ? projects.map((p) => p.slug)
      : ['ai-portfolio', 'image-processor', 'web3snapshot'];
  return [...baseSections, ...projectSections, 'contact'];
};

const Portfolio = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [targetSection, setTargetSection] = useState('hero');
  const [scrollSection, setScrollSection] = useState('hero');
  const [isNavigating, setIsNavigating] = useState(false);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const { getQueryContext } = useAuth();

  const { loading, error, data } = useQuery(GET_DEVELOPER_WITH_PROJECTS, {
    context: getQueryContext('public')
  });

  // Update projects when data changes (Apollo Client v3.14+ recommendation)
  if (data?.getDeveloper?.projects && projects !== data.getDeveloper.projects) {
    setProjects(data.getDeveloper.projects);
  }

  // Handle errors during render
  if (error) {
    console.error('Query error:', error);
  }

  useEffect(() => {
    const handleScroll = () => {
      if (isNavigating) return;

      // Special case: if we're near the top, always show hero
      if (window.scrollY < 100) {
        setScrollSection('hero');
        return;
      }

      // Check if at bottom of page
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        setScrollSection('contact');
        return;
      }

      const sections = generateSectionList(projects);
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
  }, [isNavigating, projects]);

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

  // Show loading state if either checking cookies or loading data
  if (isChecking || loading) {
    return (
      <div className="min-h-screen bg-surface-dark pt-20 overscroll-none md:px-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
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
        activeSection={activeSection}
        onActiveSectionChange={handleNavigation}
      />
      <div className="min-h-screen gradient-bg pt-20 overscroll-none md:px-20">
        {/* {(isLocalEnvironment() || getEnvironment() === 'dev') && <AuthDebug />} */}

        <TransitionManager targetSection={targetSection}>
          <HeroSection id="hero" developer={developer} />
          <FeaturedProjects id="featured" developer={developer} onNavigate={handleNavigation} />
          <SkillsSection id="skills" developer={developer} />
          {(projects.length > 0
            ? projects
            : [
                {
                  id: 'ai-portfolio',
                  title: 'AI Portfolio',
                  slug: 'ai-portfolio',
                  description: 'Serverless web application with AI-powered personalization',
                  status: 'active',
                  developer: developer,
                  developerId: developer.id || 'default-dev'
                } as ProjectType,
                {
                  id: 'image-processor',
                  title: 'Image Processor CLI',
                  slug: 'image-processor',
                  description: 'Production-ready Python application for batch image processing',
                  status: 'active',
                  developer: developer,
                  developerId: developer.id || 'default-dev'
                } as ProjectType,
                {
                  id: 'web3snapshot',
                  title: 'Web3 Snapshot Dashboard',
                  slug: 'web3snapshot',
                  description: 'Real-time cryptocurrency market analysis application',
                  status: 'active',
                  developer: developer,
                  developerId: developer.id || 'default-dev'
                } as ProjectType
              ]
          ).map((project, index) => (
            <ProjectDetailSection
              key={project.id}
              id={project.slug}
              project={project}
              backgroundIndex={index}
            />
          ))}
          <ContactSection id="contact" developer={developer} />
        </TransitionManager>

        <Footer developer={developer} />
      </div>
    </>
  );
};

export default Portfolio;
