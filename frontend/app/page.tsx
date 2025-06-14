"use client";
import HeroSection from "@/components/hero-section";
import FeaturedProjects from "@/components/featured-projects";
import SkillsSection from "@/components/skills-section";
import Footer from "@/components/footer";
import Header from "@/components/header";
import MainContent from "@/components/main-content";
import { GET_DEVELOPER_WITH_PROJECTS } from "@/queries/developers";
import { useQuery } from "@apollo/client";

const Portfolio = () => {
  const developerId = "dev-1";

  const { loading, error, data } = useQuery(GET_DEVELOPER_WITH_PROJECTS, {
    variables: { id: developerId },
    onCompleted: (data: { getDeveloper: { name: string } }) => {
      console.log("Developer data:", data);
    },
    onError: (error: Error) => {
      console.error("Query error:", error);
    },
  });

  const developer = data?.getDeveloper || {};

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

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
