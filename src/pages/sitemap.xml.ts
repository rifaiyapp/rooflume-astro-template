import { site } from '../config/site';

export const prerender = true;

const pages = ['/', '/privacy/', '/terms/', '/accessibility/', '/cookies/'];

export function GET() {
  const urls = pages.map((path) => {
    const loc = new URL(path, site.url).toString();
    return `  <url><loc>${loc}</loc></url>`;
  }).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
