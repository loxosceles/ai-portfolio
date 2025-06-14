import { DeveloperType } from '../shared/types';

function Footer({ developer }: { developer: DeveloperType }) {
  return (
    <div className="container mx-auto text-center text-muted">
      <p>
        &copy; {new Date().getFullYear()} {developer.name} Portfolio. Powered by AI and built with
        passion.
      </p>
    </div>
  );
}

export default Footer;
