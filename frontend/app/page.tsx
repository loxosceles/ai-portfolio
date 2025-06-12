"use client";
import HeroSection from "../components/hero-section";
import FeaturedProjects from "../components/featured-projects";
import SkillsSection from "../components/skills-section";
import Footer from "../components/footer";
import Header from "../components/header";
import MainContent from "../components/main-content";

const Portfolio = () => {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="fixed top-0 w-full bg-surface-medium bg-opacity-80 backdrop-blur-sm border-b border-subtle z-50">
        <Header />
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <HeroSection />
      </section>

      {/* Projects Section */}
      <section className="py-16 px-6 bg-glass-light">
        <div className="container mx-auto">
          <FeaturedProjects />
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-16 px-6">
        <SkillsSection />
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6 bg-glass-light">
        <MainContent />
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-subtle">
        <Footer />
      </footer>
    </div>
  );
};

export default Portfolio;
