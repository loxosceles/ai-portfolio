import { Mail } from 'lucide-react';
import Link from 'next/link';
import IconWrapper from '@/components/icon-wrapper';

function MainContent({
  developer
}: {
  developer: { email: string; github: string; linkedin: string };
}) {
  const { email, github, linkedin } = developer;
  return (
    <div className="container mx-auto text-center">
      <h2 className="text-4xl font-bold text-primary mb-8">Let&apos;s Connect</h2>
      <p className="text-xl text-secondary mb-8 max-w-2xl mx-auto">
        Interested in learning more about my professional journey and how I can contribute to your
        team? Let&apos;s discuss how I can support your mission.
      </p>
      <div
        className="flex flex-col sm:flex-row
          justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6"
      >
        <a
          href={`mailto:${email}`}
          className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
        >
          <Mail className="h-5 w-5" />
          <span>{email}</span>
        </a>
        <Link
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
        >
          <IconWrapper icon="linkedin" className="h-5 w-5" />
          LinkedIn
        </Link>
        <Link
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 bg-surface-light hover:bg-surface-medium text-primary px-6 py-3 rounded-lg transition-colors duration-200"
        >
          <IconWrapper icon="github" className="h-5 w-5" width={30} height={30} />
          <span>GitHub</span>
        </Link>
      </div>
    </div>
  );
}
export default MainContent;
