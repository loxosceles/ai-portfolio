import { Mail } from 'lucide-react';
import Link from 'next/link';
import { TelegramIcon, LinkedInIcon } from '@/components/icons';
import { DeveloperType } from '@/shared/types';

const isValidLinkedInUrl = (url: string): boolean => {
  return url.startsWith('https://linkedin.com/') || url.startsWith('https://www.linkedin.com/');
};

const isValidTelegramUrl = (url: string): boolean => {
  return url.startsWith('https://t.me/');
};

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
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center justify-center space-x-2 btn-primary px-6 py-3 rounded-lg w-[160px] whitespace-nowrap"
            >
              <Mail className="h-5 w-5" />
              <span>Send Email</span>
            </a>
          )}
          {linkedin && isValidLinkedInUrl(linkedin) && (
            <Link
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 btn-primary px-6 py-3 rounded-lg w-[160px] whitespace-nowrap"
            >
              <LinkedInIcon className="h-5 w-5" />
              <span>LinkedIn</span>
            </Link>
          )}
          {telegram && isValidTelegramUrl(telegram) && (
            <Link
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 btn-primary px-6 py-3 rounded-lg w-[160px] whitespace-nowrap"
            >
              <TelegramIcon className="h-5 w-5" />
              <span>Telegram</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
export default ContactSection;
