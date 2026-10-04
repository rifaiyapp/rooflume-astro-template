const mountBase = () => {
  const raw = document.documentElement.dataset.runtimeMount || '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
};

const mountedPath = (path: string) => {
  const clean = path.replace(/^\/+/, '');
  return `${mountBase()}${clean}`;
};

export function enhanceSiteReadiness() {
  // The old browser honeypot is no longer used; server-side origin checks,
  // elapsed-time validation and rate limiting protect the lead route instead.
  document.getElementById('callback-website')?.closest('div')?.remove();

  const form = document.querySelector<HTMLFormElement>('#callback');
  const note = form?.querySelector<HTMLElement>('.form-note');
  if (note) {
    note.replaceChildren();
    note.append('No spam. No obligation. By submitting, you agree to our ');
    const privacy = document.createElement('a');
    privacy.href = mountedPath('/privacy/');
    privacy.textContent = 'Privacy Policy';
    const terms = document.createElement('a');
    terms.href = mountedPath('/terms/');
    terms.textContent = 'Terms of Use';
    note.append(privacy, ' and ', terms, '.');
  }

  const footerNote = document.querySelector<HTMLElement>('.footer-bottom small');
  if (footerNote && !footerNote.querySelector('[data-legal-links]')) {
    const links = document.createElement('span');
    links.dataset.legalLinks = '';
    links.className = 'footer-legal-inline';
    const entries = [
      ['Privacy', '/privacy/'],
      ['Terms', '/terms/'],
      ['Accessibility', '/accessibility/'],
      ['Cookies', '/cookies/'],
    ];
    links.append(' · ');
    entries.forEach(([label, path], index) => {
      const anchor = document.createElement('a');
      anchor.href = mountedPath(path);
      anchor.textContent = label;
      links.append(anchor);
      if (index < entries.length - 1) links.append(' · ');
    });
    footerNote.append(links);
  }
}
