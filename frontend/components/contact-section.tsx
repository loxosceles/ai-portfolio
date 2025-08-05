import { Mail } from 'lucide-react';
import Link from 'next/link';
import { TelegramIcon, LinkedInIcon } from '@/components/icons';
import { DeveloperType } from '@/shared/types';

interface ContactSectionProps {
  id?: string;
  developer: DeveloperType;
}

function ContactSection({ id, developer }: ContactSectionProps) {
  const { email, telegram, linkedin } = developer;
  return (
    <section id={id} className="py-16 px-6">
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
            className="flex items-center space-x-2 btn-primary px-6 py-3 rounded-lg"
          >
            <Mail className="h-5 w-5" />
            <span>{email}</span>
          </a>
          <Link
            href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/${linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 btn-primary px-6 py-3 rounded-lg"
          >
            <LinkedInIcon className="h-5 w-5" />
            <span>LinkedIn</span>
          </Link>
          <Link
            href={telegram?.startsWith('http') ? telegram : `https://t.me/${telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 btn-primary px-6 py-3 rounded-lg"
          >
            <TelegramIcon className="h-5 w-5" />
            <span>Telegram</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
export default ContactSection;
