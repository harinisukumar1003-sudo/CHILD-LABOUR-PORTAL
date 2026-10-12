import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeMetadata = [
  [/^\/$/, 'Child Labour Reporting & Management System', 'Report child labour safely, track a case, and coordinate support for children.'],
  [/^\/about$/, 'About CLRMS', 'Learn how CLRMS coordinates child protection reporting, investigation, and rehabilitation.'],
  [/^\/report(?:-case)?$/, 'Report a Case', 'Submit a confidential child protection report to the CLRMS response network.'],
  [/^\/track-case$/, 'Track a Case', 'Securely check the progress of a CLRMS case using your case number and tracking code.'],
  [/^\/contact$/, 'Contact CLRMS', 'Contact the CLRMS child protection support team.'],
  [/^\/privacy-(?:policy|data-handling)$/, 'Privacy & Data Handling', 'How CLRMS protects sensitive child and family information.'],
  [/^\/login$/, 'Sign in to CLRMS', 'Sign in to your CLRMS account.'],
  [/^\/register$/, 'Create a CLRMS account', 'Create a citizen, officer, or NGO account for CLRMS.'],
  [/^\/forgot-password$/, 'Recover your CLRMS account', 'Request a secure password reset link for your CLRMS account.'],
  [/^\/reset-password\//, 'Reset your CLRMS password', 'Choose a new password for your CLRMS account.'],
];

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = routeMetadata.find(([pattern]) => pattern.test(pathname));
    const title = match?.[1] || 'CLRMS Workspace';
    const description = match?.[2] || 'Child Labour Reporting & Management System — coordinated case response and rehabilitation.';
    const image = new URL('/og-child-protection.svg', window.location.origin).href;
    document.title = `${title} | CLRMS`;

    const setMeta = (attribute, key, content) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', `${title} | CLRMS`);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:image', image);
  }, [pathname]);

  return null;
}
