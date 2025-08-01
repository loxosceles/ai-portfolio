import { DeveloperType } from '@/shared/types';

function Footer({ developer }: { developer: DeveloperType }) {
  return (
    <footer className="py-8 px-6 border-t border-subtle">
      <div className="container mx-auto text-center text-muted">
        <p>
          &copy; {new Date().getFullYear()} {developer.name} Portfolio. Powered by AI and built with
          passion.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
