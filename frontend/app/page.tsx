'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import HeroSection from '@/components/hero-section';
import FeaturedProjects from '@/components/featured-projects';
import SkillsSection from '@/components/skills-section';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { setDevelopmentCookies } from '@/utils/dev-cookies';
import MainContent from '@/components/main-content';
import { GET_DEVELOPER_WITH_PROJECTS } from '@/queries/developers';
import { useQuery } from '@apollo/client';

const Portfolio = () => {
  const developerId = 'dev-1';
  const [isChecking, setIsChecking] = useState(true);

  // Move useQuery to the top level, before any conditional returns
  const { loading, error, data } = useQuery(GET_DEVELOPER_WITH_PROJECTS, {
    variables: { id: developerId },
    onCompleted: (data: { getDeveloper: { name: string } }) => {
      if (process.env.ENVIRONMENT === 'development') {
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
    const visitorHash = params.get('visitor');

    if (process.env.NODE_ENV === 'development' && visitorHash) {
      // Set cookies directly in development
      console.log('Setting development cookies for visitor:', visitorHash);
      setDevelopmentCookies(visitorHash);
    } else if (!visitorHash) {
      // Clean up cookies if no visitor parameter
      const visitorCookies = ['visitor_company', 'visitor_name', 'visitor_context'];
      visitorCookies.forEach((cookieName) => {
        if (Cookies.get(cookieName)) {
          Cookies.remove(cookieName);
        }
      });
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
      {/* Header */}
      <header className="fixed top-0 w-full bg-surface-medium bg-opacity-80 backdrop-blur-sm border-b border-subtle z-50">
        <Header developer={developer} />
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <HeroSection developer={developer} />
      </section>

      {/* Projects Section */}
      <section className="py-16 px-6 bg-glass-light">
        <div className="container mx-auto">
          <FeaturedProjects developer={developer} />
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-16 px-6">
        <SkillsSection developer={developer} />
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-glass-light">
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
